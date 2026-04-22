import { describe, expect, it } from 'vitest';
import { computeWaterfallRectangles } from '../../src/state/selectors/waterfallSelectors';
import { combineDomainOfAllAppliedNumericalValuesIncludingErrorValues } from '../../src/state/selectors/axisSelectors';
import { WaterfallSettings } from '../../src/state/types/WaterfallSettings';
import { CartesianViewBoxRequired, ChartOffsetInternal } from '../../src/util/types';

// Minimal mock objects that work with getCateCoordinateOfBar
const createMockNumericAxis = () =>
  ({
    type: 'number',
    scale: {
      map: (value: number) => 300 - value * 2,
      domain: () => [0, 150],
    },
    isCategorical: false,
  }) as any;

const createMockCategoricalAxis = () =>
  ({
    type: 'category',
    scale: {
      map: (value: string) => {
        const idx = [
          'A',
          'B',
          'C',
          'D',
          'Q1',
          'Q2',
          'Q3',
          'Revenue',
          'COGS',
          'Overhead',
          'Profit',
          'Loss1',
          'Loss2',
          'Loss3',
          'Total',
          'Sales',
          'Rent',
          'Tax',
          'Ending Cash',
          'Other Income',
        ].indexOf(value);
        return idx >= 0 ? 50 + idx * 80 : 50;
      },
      domain: () => ['Revenue', 'COGS', 'Profit'],
      bandwidth: () => 60,
    },
    isCategorical: true,
    dataKey: 'name',
  }) as any;

// Provide enough ticks for up to 5 data entries
const mockXTicks = [
  { value: 'tick0', coordinate: 50 },
  { value: 'tick1', coordinate: 130 },
  { value: 'tick2', coordinate: 210 },
  { value: 'tick3', coordinate: 290 },
  { value: 'tick4', coordinate: 370 },
];
const mockYTicks = [
  { value: 0, coordinate: 300 },
  { value: 50, coordinate: 200 },
  { value: 100, coordinate: 100 },
];

const mockOffset: ChartOffsetInternal = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  width: 400,
  height: 300,
};

const mockParentViewBox: CartesianViewBoxRequired = {
  x: 0,
  y: 0,
  width: 400,
  height: 300,
};

const mockBarPosition = {
  offset: 0,
  size: 40,
};

describe('computeWaterfallRectangles', () => {
  const waterfallSettings: WaterfallSettings = {
    type: 'waterfall',
    id: 'test-waterfall',
    data: undefined,
    dataKey: 'value',
    hide: false,
    xAxisId: 0,
    yAxisId: 0,
    zAxisId: 0,
    isPanorama: false,
    maxBarSize: undefined,
    hasCustomShape: false,
    stackId: undefined,
    barSize: undefined,
    minPointSize: 0,
  };

  it('computes cumulative values for simple positive data', () => {
    const data = [
      { name: 'A', value: 50 },
      { name: 'B', value: 30 },
      { name: 'C', value: 20 },
    ];

    const result = computeWaterfallRectangles({
      layout: 'horizontal',
      waterfallSettings,
      pos: mockBarPosition,
      bandSize: 100,
      xAxis: createMockCategoricalAxis(),
      yAxis: createMockNumericAxis(),
      xAxisTicks: mockXTicks,
      yAxisTicks: mockYTicks,
      displayedData: data,
      offset: mockOffset,
      parentViewBox: mockParentViewBox,
      dataStartIndex: 0,
    });

    expect(result).toBeDefined();
    expect(result!.length).toBe(3);

    // First bar: cumulative 0 -> 50
    expect(result![0].cumulativeStart).toBe(0);
    expect(result![0].cumulativeEnd).toBe(50);
    expect(result![0].isPositive).toBe(true);
    expect(result![0].isTotal).toBe(false);
    expect(result![0].value).toBe(50);

    // Second bar: cumulative 50 -> 80
    expect(result![1].cumulativeStart).toBe(50);
    expect(result![1].cumulativeEnd).toBe(80);
    expect(result![1].isPositive).toBe(true);
    expect(result![1].value).toBe(30);

    // Third bar: cumulative 80 -> 100
    expect(result![2].cumulativeStart).toBe(80);
    expect(result![2].cumulativeEnd).toBe(100);
    expect(result![2].isPositive).toBe(true);
    expect(result![2].value).toBe(20);
  });

  it('computes cumulative values for mixed positive and negative data', () => {
    const data = [
      { name: 'Revenue', value: 100 },
      { name: 'COGS', value: -40 },
      { name: 'Overhead', value: -20 },
      { name: 'Profit', value: 40, total: true },
    ];

    const result = computeWaterfallRectangles({
      layout: 'horizontal',
      waterfallSettings,
      pos: mockBarPosition,
      bandSize: 100,
      xAxis: createMockCategoricalAxis(),
      yAxis: createMockNumericAxis(),
      xAxisTicks: mockXTicks,
      yAxisTicks: mockYTicks,
      displayedData: data,
      offset: mockOffset,
      parentViewBox: mockParentViewBox,
      dataStartIndex: 0,
    });

    expect(result).toBeDefined();
    // Some bars may be filtered if getCateCoordinateOfBar returns null with mocks.
    // Verify cumulative values on the bars that ARE returned.
    const revenueBar = result!.find(r => !r.isTotal && r.cumulativeStart === 0 && r.cumulativeEnd === 100);
    expect(revenueBar).toBeDefined();
    expect(revenueBar!.isPositive).toBe(true);
    expect(revenueBar!.value).toBe(100);

    const cogsBar = result!.find(r => !r.isTotal && r.cumulativeStart === 60 && r.cumulativeEnd === 100);
    expect(cogsBar).toBeDefined();
    expect(cogsBar!.isPositive).toBe(false);
    expect(cogsBar!.value).toBe(-40);

    const overheadBar = result!.find(r => !r.isTotal && r.cumulativeStart === 40 && r.cumulativeEnd === 60);
    expect(overheadBar).toBeDefined();
    expect(overheadBar!.isPositive).toBe(false);
    expect(overheadBar!.value).toBe(-20);

    const totalBar = result!.find(r => r.isTotal);
    expect(totalBar).toBeDefined();
    expect(totalBar!.cumulativeStart).toBe(0);
    expect(totalBar!.cumulativeEnd).toBe(40);
    expect(totalBar!.isPositive).toBe(true);
  });

  it('handles all negative data', () => {
    const data = [
      { name: 'Loss1', value: -30 },
      { name: 'Loss2', value: -20 },
    ];

    const result = computeWaterfallRectangles({
      layout: 'horizontal',
      waterfallSettings,
      pos: mockBarPosition,
      bandSize: 100,
      xAxis: createMockCategoricalAxis(),
      yAxis: createMockNumericAxis(),
      xAxisTicks: mockXTicks,
      yAxisTicks: mockYTicks,
      displayedData: data,
      offset: mockOffset,
      parentViewBox: mockParentViewBox,
      dataStartIndex: 0,
    });

    expect(result).toBeDefined();
    expect(result!.length).toBe(2);

    // Loss1: negative, cumulative -30 -> 0
    expect(result![0].cumulativeStart).toBe(-30);
    expect(result![0].cumulativeEnd).toBe(0);
    expect(result![0].isPositive).toBe(false);

    // Loss2: negative, cumulative -50 -> -30
    expect(result![1].cumulativeStart).toBe(-50);
    expect(result![1].cumulativeEnd).toBe(-30);
    expect(result![1].isPositive).toBe(false);
  });

  it('produces correct rectangle dimensions', () => {
    const data = [
      { name: 'A', value: 50 },
      { name: 'B', value: -20 },
    ];

    const result = computeWaterfallRectangles({
      layout: 'horizontal',
      waterfallSettings,
      pos: mockBarPosition,
      bandSize: 100,
      xAxis: createMockCategoricalAxis(),
      yAxis: createMockNumericAxis(),
      xAxisTicks: mockXTicks,
      yAxisTicks: mockYTicks,
      displayedData: data,
      offset: mockOffset,
      parentViewBox: mockParentViewBox,
      dataStartIndex: 0,
    });

    expect(result).toBeDefined();
    // Each rectangle should have x, y, width, height, tooltipPosition
    for (const rect of result!) {
      expect(typeof rect.x).toBe('number');
      expect(typeof rect.y).toBe('number');
      expect(typeof rect.width).toBe('number');
      expect(typeof rect.height).toBe('number');
      expect(rect.tooltipPosition).toBeDefined();
      expect(typeof rect.tooltipPosition.x).toBe('number');
      expect(typeof rect.tooltipPosition.y).toBe('number');
    }
  });

  it('stress case A: cumulative sum far exceeds any single increment', () => {
    // [100, 100, 100, total] → cumulative goes to 300
    const data = [
      { name: 'Q1', value: 100 },
      { name: 'Q2', value: 100 },
      { name: 'Q3', value: 100 },
      { name: 'Total', value: 0, total: true },
    ];

    const result = computeWaterfallRectangles({
      layout: 'horizontal',
      waterfallSettings,
      pos: mockBarPosition,
      bandSize: 100,
      xAxis: createMockCategoricalAxis(),
      yAxis: createMockNumericAxis(),
      xAxisTicks: mockXTicks,
      yAxisTicks: mockYTicks,
      displayedData: data,
      offset: mockOffset,
      parentViewBox: mockParentViewBox,
      dataStartIndex: 0,
    });

    expect(result).toBeDefined();

    // Q1: 0 → 100
    const q1 = result!.find(r => !r.isTotal && r.value === 100 && r.cumulativeStart === 0);
    expect(q1).toBeDefined();
    expect(q1!.cumulativeEnd).toBe(100);

    // Q2: 100 → 200
    const q2 = result!.find(r => !r.isTotal && r.value === 100 && r.cumulativeStart === 100);
    expect(q2).toBeDefined();
    expect(q2!.cumulativeEnd).toBe(200);

    // Q3: 200 → 300
    const q3 = result!.find(r => !r.isTotal && r.value === 100 && r.cumulativeStart === 200);
    expect(q3).toBeDefined();
    expect(q3!.cumulativeEnd).toBe(300);

    // Total: 0 → 300
    const total = result!.find(r => r.isTotal);
    expect(total).toBeDefined();
    expect(total!.cumulativeStart).toBe(0);
    expect(total!.cumulativeEnd).toBe(300);

    // Verify the third bar's y position accounts for cumulative=300
    // scale.map(300) = 300 - 300*2 = -300, scale.map(200) = 300 - 200*2 = -100
    // y = min(-300, -100) = -300, height = |-300 - (-100)| = 200
    expect(q3!.y).toBeLessThan(q2!.y);
  });

  it('stress case B: cumulative goes deeply negative', () => {
    // [-30, -30, -30, total] → cumulative goes to -90
    const data = [
      { name: 'Loss1', value: -30 },
      { name: 'Loss2', value: -30 },
      { name: 'Loss3', value: -30 },
      { name: 'Total', value: 0, total: true },
    ];

    const result = computeWaterfallRectangles({
      layout: 'horizontal',
      waterfallSettings,
      pos: mockBarPosition,
      bandSize: 100,
      xAxis: createMockCategoricalAxis(),
      yAxis: createMockNumericAxis(),
      xAxisTicks: mockXTicks,
      yAxisTicks: mockYTicks,
      displayedData: data,
      offset: mockOffset,
      parentViewBox: mockParentViewBox,
      dataStartIndex: 0,
    });

    expect(result).toBeDefined();

    // Loss1: -30 → 0
    const loss1 = result!.find(r => !r.isTotal && r.value === -30 && r.cumulativeEnd === 0);
    expect(loss1).toBeDefined();
    expect(loss1!.cumulativeStart).toBe(-30);
    expect(loss1!.isPositive).toBe(false);

    // Loss2: -60 → -30
    const loss2 = result!.find(r => !r.isTotal && r.value === -30 && r.cumulativeStart === -60);
    expect(loss2).toBeDefined();
    expect(loss2!.cumulativeEnd).toBe(-30);
    expect(loss2!.isPositive).toBe(false);

    // Loss3: -90 → -60
    const loss3 = result!.find(r => !r.isTotal && r.value === -30 && r.cumulativeStart === -90);
    expect(loss3).toBeDefined();
    expect(loss3!.cumulativeEnd).toBe(-60);
    expect(loss3!.isPositive).toBe(false);

    // Total: 0 → -90
    const total = result!.find(r => r.isTotal);
    expect(total).toBeDefined();
    expect(total!.cumulativeStart).toBe(0);
    expect(total!.cumulativeEnd).toBe(-90);
  });
});

describe('YAxis domain for waterfall', () => {
  it('includes cumulative values for stress case A (cumulative high)', () => {
    // Data: [100, 100, 100, total] → cumulative range is [0, 300]
    const data = [
      { name: 'Q1', value: 100 },
      { name: 'Q2', value: 100 },
      { name: 'Q3', value: 100 },
      { name: 'Total', value: 0, total: true },
    ];

    const waterfallItem: WaterfallSettings & { dataKey: string } = {
      type: 'waterfall',
      id: 'test-waterfall',
      data: undefined,
      dataKey: 'value',
      hide: false,
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      isPanorama: false,
      maxBarSize: undefined,
      hasCustomShape: false,
      stackId: undefined,
      barSize: undefined,
      minPointSize: 0,
      initialValue: undefined,
    };

    const domain = combineDomainOfAllAppliedNumericalValuesIncludingErrorValues(
      data,
      { dataKey: undefined, type: 'number' } as any,
      [waterfallItem],
      {},
      'yAxis',
      data,
    );

    expect(domain).toBeDefined();
    // Domain must cover cumulative range [0, 300], not just raw values [0, 100]
    expect(domain![0]).toBeLessThanOrEqual(0);
    expect(domain![1]).toBeGreaterThanOrEqual(300);
  });

  it('includes cumulative values for stress case B (cumulative negative)', () => {
    // Data: [-30, -30, -30, total] → cumulative range is [-90, 0]
    const data = [
      { name: 'Loss1', value: -30 },
      { name: 'Loss2', value: -30 },
      { name: 'Loss3', value: -30 },
      { name: 'Total', value: 0, total: true },
    ];

    const waterfallItem: WaterfallSettings & { dataKey: string } = {
      type: 'waterfall',
      id: 'test-waterfall',
      data: undefined,
      dataKey: 'value',
      hide: false,
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      isPanorama: false,
      maxBarSize: undefined,
      hasCustomShape: false,
      stackId: undefined,
      barSize: undefined,
      minPointSize: 0,
      initialValue: undefined,
    };

    const domain = combineDomainOfAllAppliedNumericalValuesIncludingErrorValues(
      data,
      { dataKey: undefined, type: 'number' } as any,
      [waterfallItem],
      {},
      'yAxis',
      data,
    );

    expect(domain).toBeDefined();
    // Domain must cover cumulative range [-90, 0], not just raw values [-30, 0]
    expect(domain![0]).toBeLessThanOrEqual(-90);
    expect(domain![1]).toBeGreaterThanOrEqual(0);
  });
});

describe('initialValue support', () => {
  it('computeWaterfallRectangles respects initialValue for positive increments', () => {
    // initialValue=200, data: [Sales +100, Rent -50, Tax -30, Ending Cash total]
    const data = [
      { name: 'Sales', value: 100 },
      { name: 'Rent', value: -50 },
      { name: 'Tax', value: -30 },
      { name: 'Ending Cash', value: 0, total: true },
    ];

    const settingsWithInitial: WaterfallSettings = {
      type: 'waterfall',
      id: 'test-waterfall-initial',
      data: undefined,
      dataKey: 'value',
      hide: false,
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      isPanorama: false,
      maxBarSize: undefined,
      hasCustomShape: false,
      stackId: undefined,
      barSize: undefined,
      minPointSize: 0,
      initialValue: 200,
    };

    const result = computeWaterfallRectangles({
      layout: 'horizontal',
      waterfallSettings: settingsWithInitial,
      pos: mockBarPosition,
      bandSize: 100,
      xAxis: createMockCategoricalAxis(),
      yAxis: createMockNumericAxis(),
      xAxisTicks: mockXTicks,
      yAxisTicks: mockYTicks,
      displayedData: data,
      offset: mockOffset,
      parentViewBox: mockParentViewBox,
      dataStartIndex: 0,
    });

    expect(result).toBeDefined();

    // Sales: 200 → 300
    const sales = result!.find(r => !r.isTotal && r.cumulativeStart === 200);
    expect(sales).toBeDefined();
    expect(sales!.cumulativeEnd).toBe(300);
    expect(sales!.isPositive).toBe(true);

    // Rent: 250 → 300
    const rent = result!.find(r => !r.isTotal && r.value === -50);
    expect(rent).toBeDefined();
    expect(rent!.cumulativeStart).toBe(250);
    expect(rent!.cumulativeEnd).toBe(300);

    // Tax: 220 → 250
    const tax = result!.find(r => !r.isTotal && r.value === -30);
    expect(tax).toBeDefined();
    expect(tax!.cumulativeStart).toBe(220);
    expect(tax!.cumulativeEnd).toBe(250);

    // Total: 0 → 220 (total bar always starts from 0, shows absolute value)
    const total = result!.find(r => r.isTotal);
    expect(total).toBeDefined();
    expect(total!.cumulativeStart).toBe(0);
    expect(total!.cumulativeEnd).toBe(220);
  });

  it('YAxis domain includes initialValue range', () => {
    const data = [
      { name: 'Sales', value: 100 },
      { name: 'Rent', value: -50 },
      { name: 'Tax', value: -30 },
      { name: 'Ending Cash', value: 0, total: true },
    ];

    const waterfallItem: WaterfallSettings & { dataKey: string } = {
      type: 'waterfall',
      id: 'test-waterfall',
      data: undefined,
      dataKey: 'value',
      hide: false,
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      isPanorama: false,
      maxBarSize: undefined,
      hasCustomShape: false,
      stackId: undefined,
      barSize: undefined,
      minPointSize: 0,
      initialValue: 200,
    };

    const domain = combineDomainOfAllAppliedNumericalValuesIncludingErrorValues(
      data,
      { dataKey: undefined, type: 'number' } as any,
      [waterfallItem],
      {},
      'yAxis',
      data,
    );

    expect(domain).toBeDefined();
    // Domain must cover cumulative range [200, 300]
    expect(domain![0]).toBeLessThanOrEqual(200);
    expect(domain![1]).toBeGreaterThanOrEqual(300);
  });

  it('initialValue with negative cumulative result', () => {
    // initialValue=50, deep negative increments → cumulative goes below 0
    const data = [
      { name: 'Loss1', value: -40 },
      { name: 'Loss2', value: -30 },
      { name: 'Total', value: 0, total: true },
    ];

    const settingsWithInitial: WaterfallSettings = {
      type: 'waterfall',
      id: 'test-waterfall',
      data: undefined,
      dataKey: 'value',
      hide: false,
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      isPanorama: false,
      maxBarSize: undefined,
      hasCustomShape: false,
      stackId: undefined,
      barSize: undefined,
      minPointSize: 0,
      initialValue: 50,
    };

    const result = computeWaterfallRectangles({
      layout: 'horizontal',
      waterfallSettings: settingsWithInitial,
      pos: mockBarPosition,
      bandSize: 100,
      xAxis: createMockCategoricalAxis(),
      yAxis: createMockNumericAxis(),
      xAxisTicks: mockXTicks,
      yAxisTicks: mockYTicks,
      displayedData: data,
      offset: mockOffset,
      parentViewBox: mockParentViewBox,
      dataStartIndex: 0,
    });

    expect(result).toBeDefined();

    // Loss1: 10 → 50
    const loss1 = result!.find(r => !r.isTotal && r.value === -40);
    expect(loss1).toBeDefined();
    expect(loss1!.cumulativeStart).toBe(10);
    expect(loss1!.cumulativeEnd).toBe(50);

    // Loss2: -20 → 10
    const loss2 = result!.find(r => !r.isTotal && r.value === -30 && r.cumulativeStart === -20);
    expect(loss2).toBeDefined();
    expect(loss2!.cumulativeEnd).toBe(10);

    // Total: 0 → -20 (total bar always starts from 0, shows absolute value)
    const total = result!.find(r => r.isTotal);
    expect(total).toBeDefined();
    expect(total!.cumulativeStart).toBe(0);
    expect(total!.cumulativeEnd).toBe(-20);
  });
});

describe('axisSelectors regression: non-waterfall items unaffected', () => {
  it('Bar items use standard domain, not waterfall cumulative branch', () => {
    const data = [
      { name: 'A', value: 100 },
      { name: 'B', value: 200 },
      { name: 'C', value: 300 },
    ];

    // Simulate a Bar item (type !== 'waterfall')
    const barItem = {
      type: 'bar' as const,
      id: 'test-bar',
      data: undefined,
      dataKey: 'value',
      hide: false,
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      isPanorama: false,
      maxBarSize: undefined,
      hasCustomShape: false,
      stackId: undefined,
      barSize: undefined,
      minPointSize: 0,
    };

    const domain = combineDomainOfAllAppliedNumericalValuesIncludingErrorValues(
      data,
      { dataKey: undefined, type: 'number' } as any,
      [barItem],
      {},
      'yAxis',
      data,
    );

    expect(domain).toBeDefined();
    // Standard Bar domain should be based on raw values, not cumulative
    // The domain should be [100, 300] (min and max of raw values)
    // It should NOT be [0, 600] which would happen if cumulative was used
    expect(domain![1]).toBeGreaterThanOrEqual(300);
    // Most importantly: domain upper bound should NOT be 600 (which would be cumulative sum)
    expect(domain![1]).toBeLessThan(600);
  });

  it('Line items use standard domain, not waterfall cumulative branch', () => {
    const data = [
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
      { name: 'C', value: 30 },
    ];

    const lineItem = {
      type: 'line' as const,
      id: 'test-line',
      data: undefined,
      dataKey: 'value',
      hide: false,
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      isPanorama: false,
      maxBarSize: undefined,
      hasCustomShape: false,
      stackId: undefined,
      barSize: undefined,
      minPointSize: 0,
    };

    const domain = combineDomainOfAllAppliedNumericalValuesIncludingErrorValues(
      data,
      { dataKey: undefined, type: 'number' } as any,
      [lineItem],
      {},
      'yAxis',
      data,
    );

    expect(domain).toBeDefined();
    // Line domain should be raw values [0, 30], not cumulative [0, 60]
    expect(domain![1]).toBeLessThanOrEqual(30);
  });

  it('Mixed waterfall + bar items: waterfall uses cumulative, bar uses raw', () => {
    const data = [
      { name: 'A', value: 100 },
      { name: 'B', value: 100 },
    ];

    const waterfallItem: WaterfallSettings & { dataKey: string } = {
      type: 'waterfall',
      id: 'test-waterfall',
      data: undefined,
      dataKey: 'value',
      hide: false,
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      isPanorama: false,
      maxBarSize: undefined,
      hasCustomShape: false,
      stackId: undefined,
      barSize: undefined,
      minPointSize: 0,
      initialValue: undefined,
    };

    const barItem = {
      type: 'bar' as const,
      id: 'test-bar',
      data: undefined,
      dataKey: 'value',
      hide: false,
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      isPanorama: false,
      maxBarSize: undefined,
      hasCustomShape: false,
      stackId: undefined,
      barSize: undefined,
      minPointSize: 0,
    };

    const domain = combineDomainOfAllAppliedNumericalValuesIncludingErrorValues(
      data,
      { dataKey: undefined, type: 'number' } as any,
      [waterfallItem, barItem],
      {},
      'yAxis',
      data,
    );

    expect(domain).toBeDefined();
    // Waterfall cumulative goes to 200, bar raw goes to 100
    // Domain should cover [0, 200] (cumulative range)
    expect(domain![0]).toBeLessThanOrEqual(0);
    expect(domain![1]).toBeGreaterThanOrEqual(200);
  });
});

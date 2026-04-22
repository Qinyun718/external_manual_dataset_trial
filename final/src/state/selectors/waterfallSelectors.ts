import { createSelector } from 'reselect';
import { ReactElement } from 'react';
import { RechartsRootState } from '../store';
import {
  BaseAxisWithScale,
  selectAxisWithScale,
  selectCartesianAxisSize,
  selectTicksOfGraphicalItem,
  selectUnfilteredCartesianItems,
} from './axisSelectors';
import { isNullish } from '../../util/DataUtils';
import { getBandSizeOfAxis, getCateCoordinateOfBar, StackId, BarPositionPosition } from '../../util/ChartUtils';
import {
  CartesianViewBoxRequired,
  ChartOffsetInternal,
  DataKey,
  LayoutType,
  TickItem,
  Coordinate,
} from '../../util/types';
import { selectChartLayout } from '../../context/chartLayoutContext';
import { ChartData } from '../chartDataSlice';
import { selectChartDataWithIndexesIfNotInPanoramaPosition3 } from './dataSelectors';
import { selectAxisViewBox, selectChartOffsetInternal } from './selectChartOffsetInternal';
import { selectBarCategoryGap, selectBarGap, selectRootBarSize, selectRootMaxBarSize } from './rootPropsSelectors';
import { WaterfallSettings } from '../types/WaterfallSettings';
import { GraphicalItemId } from '../graphicalItemsSlice';
import { BarCategory, combineBarSizeList } from './combiners/combineBarSizeList';
import { combineAllBarPositions } from './combiners/combineAllBarPositions';
import { selectXAxisIdFromGraphicalItemId, selectYAxisIdFromGraphicalItemId } from './graphicalItemSelectors';
import { combineBarPosition } from './combiners/combineBarPosition';

import { Props as RectangleProps } from '../../shape/Rectangle';

const pickIsPanorama = (_state: RechartsRootState, _id: GraphicalItemId, isPanorama: boolean): boolean => isPanorama;

const pickBarId = (_state: RechartsRootState, id: GraphicalItemId): GraphicalItemId => id;

const pickCells = (
  _state: RechartsRootState,
  _id: GraphicalItemId,
  _isPanorama: boolean,
  cells: ReadonlyArray<ReactElement> | undefined,
): ReadonlyArray<ReactElement> | undefined => cells;

const selectSynchronisedWaterfallSettings: (
  state: RechartsRootState,
  id: GraphicalItemId,
) => WaterfallSettings | undefined = createSelector(
  [selectUnfilteredCartesianItems, pickBarId],
  (graphicalItems, id: GraphicalItemId) =>
    graphicalItems.filter(item => item.type === 'waterfall').find(item => item.id === id),
);

export const selectMaxWaterfallBarSize: (state: RechartsRootState, id: GraphicalItemId) => number | undefined =
  createSelector(
    [selectSynchronisedWaterfallSettings],
    (waterfallSettings: WaterfallSettings | undefined) => waterfallSettings?.maxBarSize,
  );

export const selectAllVisibleWaterfallBars: (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
) => ReadonlyArray<WaterfallSettings> = createSelector(
  [
    selectChartLayout,
    selectUnfilteredCartesianItems,
    selectXAxisIdFromGraphicalItemId,
    selectYAxisIdFromGraphicalItemId,
    pickIsPanorama,
  ],
  (layout: LayoutType, allItems, xAxisId, yAxisId, isPanorama) =>
    allItems
      .filter(i => {
        if (layout === 'horizontal') {
          return i.xAxisId === xAxisId;
        }
        return i.yAxisId === yAxisId;
      })
      .filter(i => i.isPanorama === isPanorama)
      .filter(i => i.hide === false)
      .filter(i => i.type === 'waterfall'),
);

export type SizeList = ReadonlyArray<BarCategory>;

export const selectWaterfallBarCartesianAxisSize = (state: RechartsRootState, id: GraphicalItemId) => {
  const layout = selectChartLayout(state);
  const xAxisId = selectXAxisIdFromGraphicalItemId(state, id);
  const yAxisId = selectYAxisIdFromGraphicalItemId(state, id);
  if (xAxisId == null || yAxisId == null) {
    return undefined;
  }
  if (layout === 'horizontal') {
    return selectCartesianAxisSize(state, 'xAxis', xAxisId);
  }
  return selectCartesianAxisSize(state, 'yAxis', yAxisId);
};

export const selectWaterfallBarSizeList: (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
) => SizeList = createSelector(
  [selectAllVisibleWaterfallBars, selectRootBarSize, selectWaterfallBarCartesianAxisSize],
  combineBarSizeList,
);

export const selectWaterfallBarBandSize: (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
) => number = (state: RechartsRootState, id: GraphicalItemId, isPanorama: boolean): number => {
  const waterfallSettings: WaterfallSettings | undefined = selectSynchronisedWaterfallSettings(state, id);
  if (waterfallSettings == null) {
    return 0;
  }
  const xAxisId = selectXAxisIdFromGraphicalItemId(state, id);
  const yAxisId = selectYAxisIdFromGraphicalItemId(state, id);
  if (xAxisId == null || yAxisId == null) {
    return 0;
  }
  const layout = selectChartLayout(state);
  const globalMaxBarSize: number | undefined = selectRootMaxBarSize(state);
  const { maxBarSize: childMaxBarSize } = waterfallSettings;
  const maxBarSize: number | undefined = isNullish(childMaxBarSize) ? globalMaxBarSize : childMaxBarSize;
  let axis: BaseAxisWithScale | undefined, ticks: ReadonlyArray<TickItem> | undefined;
  if (layout === 'horizontal') {
    axis = selectAxisWithScale(state, 'xAxis', xAxisId, isPanorama);
    ticks = selectTicksOfGraphicalItem(state, 'xAxis', xAxisId, isPanorama);
  } else {
    axis = selectAxisWithScale(state, 'yAxis', yAxisId, isPanorama);
    ticks = selectTicksOfGraphicalItem(state, 'yAxis', yAxisId, isPanorama);
  }
  return getBandSizeOfAxis(axis, ticks, true) ?? maxBarSize ?? 0;
};

export const selectAxisBandSize = (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
): number | undefined => {
  const layout = selectChartLayout(state);
  const xAxisId = selectXAxisIdFromGraphicalItemId(state, id);
  const yAxisId = selectYAxisIdFromGraphicalItemId(state, id);
  if (xAxisId == null || yAxisId == null) {
    return undefined;
  }
  let axis: BaseAxisWithScale | undefined, ticks: ReadonlyArray<TickItem> | undefined;
  if (layout === 'horizontal') {
    axis = selectAxisWithScale(state, 'xAxis', xAxisId, isPanorama);
    ticks = selectTicksOfGraphicalItem(state, 'xAxis', xAxisId, isPanorama);
  } else {
    axis = selectAxisWithScale(state, 'yAxis', yAxisId, isPanorama);
    ticks = selectTicksOfGraphicalItem(state, 'yAxis', yAxisId, isPanorama);
  }
  return getBandSizeOfAxis(axis, ticks);
};

export type WaterfallBarWithPosition = {
  stackId: StackId | undefined;
  dataKeys: ReadonlyArray<DataKey<any>>;
  position: BarPositionPosition;
};

export const selectAllWaterfallBarPositions: (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
) => ReadonlyArray<WaterfallBarWithPosition> | undefined = createSelector(
  [
    selectWaterfallBarSizeList,
    selectRootMaxBarSize,
    selectBarGap,
    selectBarCategoryGap,
    selectWaterfallBarBandSize,
    selectAxisBandSize,
    selectMaxWaterfallBarSize,
  ],
  combineAllBarPositions,
);

const selectXAxisWithScale = (state: RechartsRootState, id: GraphicalItemId, isPanorama: boolean) => {
  const xAxisId = selectXAxisIdFromGraphicalItemId(state, id);
  if (xAxisId == null) {
    return undefined;
  }
  return selectAxisWithScale(state, 'xAxis', xAxisId, isPanorama);
};

const selectYAxisWithScale = (state: RechartsRootState, id: GraphicalItemId, isPanorama: boolean) => {
  const yAxisId = selectYAxisIdFromGraphicalItemId(state, id);
  if (yAxisId == null) {
    return undefined;
  }
  return selectAxisWithScale(state, 'yAxis', yAxisId, isPanorama);
};

const selectXAxisTicks = (state: RechartsRootState, id: GraphicalItemId, isPanorama: boolean) => {
  const xAxisId = selectXAxisIdFromGraphicalItemId(state, id);
  if (xAxisId == null) {
    return undefined;
  }
  return selectTicksOfGraphicalItem(state, 'xAxis', xAxisId, isPanorama);
};

const selectYAxisTicks = (state: RechartsRootState, id: GraphicalItemId, isPanorama: boolean) => {
  const yAxisId = selectYAxisIdFromGraphicalItemId(state, id);
  if (yAxisId == null) {
    return undefined;
  }
  return selectTicksOfGraphicalItem(state, 'yAxis', yAxisId, isPanorama);
};

export const selectWaterfallBarPosition: (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
) => BarPositionPosition | undefined = createSelector(
  [selectAllWaterfallBarPositions, selectSynchronisedWaterfallSettings],
  combineBarPosition,
);

/**
 * Computed rectangle data for each waterfall bar.
 * Unlike regular Bar which uses [baseValue, rawValue],
 * waterfall bars use cumulativeStart and cumulativeEnd to determine their position.
 */
export interface WaterfallRectangleItem extends RectangleProps {
  value: number;
  /** Cumulative start value for this bar */
  cumulativeStart: number;
  /** Cumulative end value for this bar */
  cumulativeEnd: number;
  /** Whether this bar represents a total/summary */
  isTotal: boolean;
  /** Whether the increment is positive */
  isPositive: boolean;
  /** Tooltip position */
  tooltipPosition: Coordinate;
  readonly payload?: any;
  parentViewBox: CartesianViewBoxRequired;
  x: number;
  y: number;
  width: number;
  height: number;
  background?: { x: number; y: number; width: number; height: number };
  originalDataIndex: number;
}

/**
 * Compute waterfall rectangles.
 * Key difference from regular bar: each bar's position is determined by cumulative sum,
 * not by a fixed base value. Positive increments go up from the cumulative start,
 * negative increments go down from the cumulative start.
 */
export function computeWaterfallRectangles({
  layout,
  waterfallSettings,
  pos,
  bandSize,
  xAxis,
  yAxis,
  xAxisTicks,
  yAxisTicks,
  displayedData,
  offset,
  parentViewBox,
  _dataStartIndex,
}: {
  layout: 'horizontal' | 'vertical';
  waterfallSettings: WaterfallSettings;
  pos: BarPositionPosition;
  bandSize: number;
  xAxis: BaseAxisWithScale;
  yAxis: BaseAxisWithScale;
  xAxisTicks: TickItem[];
  yAxisTicks: TickItem[];
  offset: ChartOffsetInternal;
  displayedData: ChartData;
  parentViewBox: CartesianViewBoxRequired;
  _dataStartIndex: number;
}): ReadonlyArray<WaterfallRectangleItem> | undefined {
  const { dataKey, initialValue } = waterfallSettings;

  // First pass: compute cumulative values
  const cumulativeValues: Array<{ start: number; end: number; value: number; isTotal: boolean; isPositive: boolean }> =
    [];
  let cumulative = initialValue ?? 0;

  for (let i = 0; i < displayedData.length; i++) {
    const entry = displayedData[i];
    const rawValue = dataKey != null ? (entry as Record<string, unknown>)[dataKey as string] : undefined;

    // Check if this is a total/summary bar (marked by the data having total=true)
    const isTotal = (entry as Record<string, unknown>).total === true;

    if (isTotal) {
      // Total bar: always from 0 to cumulative sum (shows absolute value)
      cumulativeValues.push({
        start: 0,
        end: cumulative,
        value: cumulative,
        isTotal: true,
        isPositive: cumulative >= 0,
      });
    } else {
      const value = typeof rawValue === 'number' ? rawValue : 0;
      const start = value >= 0 ? cumulative : cumulative + value;
      const end = value >= 0 ? cumulative + value : cumulative;
      cumulative += value;
      cumulativeValues.push({
        start,
        end,
        value,
        isTotal: false,
        isPositive: value >= 0,
      });
    }
  }

  // Second pass: compute pixel positions
  return displayedData
    .map((entry: unknown, index): WaterfallRectangleItem | null => {
      const cumVal = cumulativeValues[index];
      if (cumVal == null) {
        return null;
      }

      let x: number,
        y: number,
        width: number,
        height: number,
        background: { x: number; y: number; width: number; height: number };

      if (layout === 'horizontal') {
        const startScale = yAxis.scale.map(cumVal.start);
        const endScale = yAxis.scale.map(cumVal.end);
        if (startScale == null || endScale == null) {
          return null;
        }
        const cateX = getCateCoordinateOfBar({
          axis: xAxis,
          ticks: xAxisTicks,
          bandSize,
          offset: pos.offset,
          entry,
          index,
        });
        if (cateX == null) {
          return null;
        }
        x = cateX;
        // For horizontal layout, Y axis is numeric (inverted: higher values = lower y)
        y = Math.min(startScale, endScale);
        width = pos.size;
        height = Math.abs(endScale - startScale);
        background = { x, y: offset.top, width, height: offset.height };
      } else {
        const startScale = xAxis.scale.map(cumVal.start);
        const endScale = xAxis.scale.map(cumVal.end);
        if (startScale == null || endScale == null) {
          return null;
        }
        const cateY = getCateCoordinateOfBar({
          axis: yAxis,
          ticks: yAxisTicks,
          bandSize,
          offset: pos.offset,
          entry,
          index,
        });
        if (cateY == null) {
          return null;
        }
        x = Math.min(startScale, endScale);
        y = cateY;
        width = Math.abs(endScale - startScale);
        height = pos.size;
        background = { x: offset.left, y, width: offset.width, height };
      }

      // Filter out zero-dimension rectangles
      if (width === 0 || height === 0) {
        return null;
      }

      const waterfallRectangleItem: WaterfallRectangleItem = {
        // @ts-expect-error spread of unknown type
        ...entry,
        x,
        y,
        width,
        height,
        value: cumVal.value,
        cumulativeStart: cumVal.start,
        cumulativeEnd: cumVal.end,
        isTotal: cumVal.isTotal,
        isPositive: cumVal.isPositive,
        payload: entry,
        background,
        tooltipPosition: { x: x + width / 2, y: y + height / 2 },
        parentViewBox,
        originalDataIndex: index,
      };

      return waterfallRectangleItem;
    })
    .filter(Boolean) as ReadonlyArray<WaterfallRectangleItem>;
}

export const selectWaterfallRectangles: (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
  cells: ReadonlyArray<ReactElement> | undefined,
) => ReadonlyArray<WaterfallRectangleItem> | undefined = createSelector(
  [
    selectChartOffsetInternal,
    selectAxisViewBox,
    selectXAxisWithScale,
    selectYAxisWithScale,
    selectXAxisTicks,
    selectYAxisTicks,
    selectWaterfallBarPosition,
    selectChartLayout,
    selectChartDataWithIndexesIfNotInPanoramaPosition3,
    selectAxisBandSize,
    selectSynchronisedWaterfallSettings,
    pickCells,
  ],
  (
    offset: ChartOffsetInternal,
    axisViewBox: CartesianViewBoxRequired,
    xAxis: BaseAxisWithScale | undefined,
    yAxis: BaseAxisWithScale | undefined,
    xAxisTicks,
    yAxisTicks,
    pos: BarPositionPosition | undefined,
    layout: LayoutType,
    { chartData, dataStartIndex, dataEndIndex },
    bandSize,
    waterfallSettings: WaterfallSettings | undefined,
    _cells,
  ): ReadonlyArray<WaterfallRectangleItem> | undefined => {
    if (
      waterfallSettings == null ||
      pos == null ||
      axisViewBox == null ||
      (layout !== 'horizontal' && layout !== 'vertical') ||
      xAxis == null ||
      yAxis == null ||
      xAxisTicks == null ||
      yAxisTicks == null ||
      bandSize == null
    ) {
      return undefined;
    }

    const { data } = waterfallSettings;
    let displayedData: ChartData | undefined;
    if (data != null && data.length > 0) {
      displayedData = data;
    } else {
      displayedData = chartData?.slice(dataStartIndex, dataEndIndex + 1);
    }

    if (displayedData == null) {
      return undefined;
    }

    return computeWaterfallRectangles({
      layout,
      waterfallSettings,
      pos,
      parentViewBox: axisViewBox,
      bandSize,
      xAxis,
      yAxis,
      xAxisTicks,
      yAxisTicks,
      displayedData,
      offset,
      _dataStartIndex: dataStartIndex,
    });
  },
);

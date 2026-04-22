import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { WaterfallChart, WaterfallBar, XAxis, YAxis, Tooltip } from '../../src';
import { assertNotNull } from '../helper/assertNotNull';

const waterfallData = [
  { name: 'Revenue', value: 100 },
  { name: 'COGS', value: -40 },
  { name: 'Overhead', value: -20 },
  { name: 'Profit', value: 40, total: true },
];

describe('WaterfallChart', () => {
  it('renders without crashing with minimal props', () => {
    const { container } = render(
      <WaterfallChart width={400} height={300} data={waterfallData}>
        <WaterfallBar dataKey="value" />
      </WaterfallChart>,
    );

    const chartWrapper = container.querySelector('.recharts-wrapper');
    assertNotNull(chartWrapper);
    expect(chartWrapper).toBeTruthy();
  });

  it('renders waterfall bar rectangles', () => {
    const { container } = render(
      <WaterfallChart width={400} height={300} data={waterfallData}>
        <XAxis dataKey="name" />
        <YAxis />
        <WaterfallBar dataKey="value" />
      </WaterfallChart>,
    );

    const bars = container.querySelectorAll('.recharts-waterfall-bar-rectangle');
    // The data has 4 items; some may be filtered if they have zero height
    expect(bars.length).toBeGreaterThan(0);
  });

  it('renders connector lines by default', () => {
    const { container } = render(
      <WaterfallChart width={400} height={300} data={waterfallData}>
        <XAxis dataKey="name" />
        <YAxis />
        <WaterfallBar dataKey="value" />
      </WaterfallChart>,
    );

    const connectors = container.querySelectorAll('line');
    // There should be some connector lines (between adjacent bars)
    expect(connectors.length).toBeGreaterThan(0);
  });

  it('hides connector lines when showConnectors is false', () => {
    const { container } = render(
      <WaterfallChart width={400} height={300} data={waterfallData}>
        <XAxis dataKey="name" />
        <YAxis />
        <WaterfallBar dataKey="value" showConnectors={false} />
      </WaterfallChart>,
    );

    // SVG lines may still exist for axes etc, but there should be no connector lines
    // Check that the waterfall-bars layer doesn't have connector lines by checking
    // that there's no line with strokeDasharray="4 2" (the default connector style)
    const dashedLines = container.querySelectorAll('line[stroke-dasharray="4 2"]');
    expect(dashedLines.length).toBe(0);
  });

  it('renders with custom fill colors', () => {
    const { container } = render(
      <WaterfallChart width={400} height={300} data={waterfallData}>
        <XAxis dataKey="name" />
        <YAxis />
        <WaterfallBar dataKey="value" positiveFill="#00ff00" negativeFill="#ff0000" totalFill="#0000ff" />
      </WaterfallChart>,
    );

    const bars = container.querySelectorAll('.recharts-waterfall-bar-rectangle');
    expect(bars.length).toBeGreaterThan(0);

    // Check that at least one bar has a fill attribute
    const filledBars = Array.from(bars).filter(bar => bar.getAttribute('fill'));
    expect(filledBars.length).toBeGreaterThan(0);
  });

  it('renders with Tooltip', () => {
    const { container } = render(
      <WaterfallChart width={400} height={300} data={waterfallData}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <WaterfallBar dataKey="value" />
      </WaterfallChart>,
    );

    // The tooltip wrapper may or may not be visible initially, but the component should not crash
    expect(container.querySelector('.recharts-wrapper')).toBeTruthy();
  });

  it('renders with initialValue without crashing', () => {
    const initialData = [
      { name: 'Starting Cash', value: 0, total: true },
      { name: 'Sales', value: 100 },
      { name: 'Rent', value: -50 },
      { name: 'Ending Cash', value: 0, total: true },
    ];

    const { container } = render(
      <WaterfallChart width={400} height={300} data={initialData}>
        <XAxis dataKey="name" />
        <YAxis />
        <WaterfallBar dataKey="value" initialValue={200} />
      </WaterfallChart>,
    );

    const bars = container.querySelectorAll('.recharts-waterfall-bar-rectangle');
    expect(bars.length).toBeGreaterThan(0);
  });
});

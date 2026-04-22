import React from 'react';
import { WaterfallChart, WaterfallBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from '../../../../src';

export default {
  component: WaterfallChart,
  docs: {
    autodocs: false,
  },
};

const waterfallData = [
  { name: 'Revenue', value: 100 },
  { name: 'COGS', value: -40 },
  { name: 'Overhead', value: -20 },
  { name: 'Other Income', value: 10 },
  { name: 'Profit', value: 50, total: true },
];

const waterfallData2 = [
  { name: 'Q1 Sales', value: 240 },
  { name: 'Q2 Sales', value: 180 },
  { name: 'Returns', value: -60 },
  { name: 'Discounts', value: -30 },
  { name: 'Q3 Sales', value: 150 },
  { name: 'Net', value: 0, total: true },
];

export const SimpleWaterfall = {
  render: () => {
    return (
      <WaterfallChart
        width={600}
        height={400}
        data={waterfallData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <WaterfallBar dataKey="value" connectorStyle={{ stroke: '#555', strokeWidth: 2, strokeDasharray: '6 3' }} />
      </WaterfallChart>
    );
  },
};

export const WaterfallWithCustomColors = {
  render: () => {
    return (
      <WaterfallChart
        width={600}
        height={400}
        data={waterfallData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <WaterfallBar dataKey="value" positiveFill="#2ecc71" negativeFill="#e74c3c" totalFill="#3498db" />
      </WaterfallChart>
    );
  },
};

export const WaterfallWithLabels = {
  render: () => {
    return (
      <WaterfallChart
        width={600}
        height={400}
        data={waterfallData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <WaterfallBar
          dataKey="value"
          positiveFill="#2ecc71"
          negativeFill="#e74c3c"
          totalFill="#3498db"
          label={{ position: 'top', fill: '#333', fontSize: 12 }}
        />
      </WaterfallChart>
    );
  },
};

export const WaterfallWithoutConnectors = {
  render: () => {
    return (
      <WaterfallChart
        width={600}
        height={400}
        data={waterfallData2}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <WaterfallBar
          dataKey="value"
          positiveFill="#8e44ad"
          negativeFill="#f39c12"
          totalFill="#1abc9c"
          showConnectors={false}
        />
      </WaterfallChart>
    );
  },
};

// Stress case A: cumulative sum (300) far exceeds any single increment (max 100)
const cumulativeHighData = [
  { name: 'Q1', value: 100 },
  { name: 'Q2', value: 100 },
  { name: 'Q3', value: 100 },
  { name: 'Total', value: 0, total: true },
];

export const WaterfallCumulativeHigh = {
  render: () => {
    return (
      <WaterfallChart
        width={600}
        height={400}
        data={cumulativeHighData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <WaterfallBar dataKey="value" positiveFill="#2ecc71" negativeFill="#e74c3c" totalFill="#3498db" />
      </WaterfallChart>
    );
  },
};

// Stress case B: cumulative goes deeply negative
const cumulativeNegativeData = [
  { name: 'Loss1', value: -30 },
  { name: 'Loss2', value: -30 },
  { name: 'Loss3', value: -30 },
  { name: 'Total', value: 0, total: true },
];

export const WaterfallCumulativeNegative = {
  render: () => {
    return (
      <WaterfallChart
        width={600}
        height={400}
        data={cumulativeNegativeData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <WaterfallBar dataKey="value" positiveFill="#2ecc71" negativeFill="#e74c3c" totalFill="#3498db" />
      </WaterfallChart>
    );
  },
};

// Initial value scenario: Starting Cash = 200, increments applied on top of that baseline
const initialValueData = [
  { name: 'Sales', value: 100 },
  { name: 'Rent', value: -50 },
  { name: 'Tax', value: -30 },
  { name: 'Ending Cash', value: 0, total: true },
];

export const WaterfallWithInitialValue = {
  render: () => {
    return (
      <WaterfallChart
        width={600}
        height={400}
        data={initialValueData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <WaterfallBar
          dataKey="value"
          initialValue={200}
          positiveFill="#2ecc71"
          negativeFill="#e74c3c"
          totalFill="#3498db"
          connectorStyle={{ stroke: '#555', strokeWidth: 2, strokeDasharray: '6 3' }}
          label={{ position: 'top', fill: '#333', fontSize: 12 }}
        />
      </WaterfallChart>
    );
  },
};

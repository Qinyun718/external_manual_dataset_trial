import { BaseCartesianGraphicalItemSettings } from '../graphicalItemsSlice';
import { MaybeStackedGraphicalItem } from './StackedGraphicalItem';

export type WaterfallSettings = BaseCartesianGraphicalItemSettings &
  MaybeStackedGraphicalItem & {
    type: 'waterfall';
    maxBarSize: number | undefined;
    /**
     * When true, zero-dimension bars are not filtered out because the custom shape may still render something visible.
     */
    hasCustomShape: boolean;
    minPointSize: number;
    /**
     * Starting cumulative value for the waterfall chart.
     * When set, the first bar starts from this value instead of 0.
     * @defaultValue 0
     */
    initialValue: number | undefined;
  };

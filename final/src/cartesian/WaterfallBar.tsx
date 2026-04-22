import * as React from 'react';
import { Key, PureComponent, ReactElement, ReactNode } from 'react';
import { clsx } from 'clsx';
import { Layer } from '../container/Layer';
import { Cell } from '../component/Cell';
import {
  CartesianLabelListContextProvider,
  CartesianLabelListEntry,
  ImplicitLabelListType,
  LabelListFromLabelProp,
} from '../component/LabelList';
import { noop } from '../util/DataUtils';
import { findAllByType } from '../util/ReactUtils';
import { getTooltipNameProp } from '../util/ChartUtils';
import {
  ActiveShape,
  DataConsumer,
  DataKey,
  LegendType,
  PresentationAttributesAdaptChildEvent,
  TooltipType,
  TrapezoidViewBox,
} from '../util/types';
import { BarRectangle, BarRectangleProps } from '../util/BarUtils';
import type { BarShapeProps } from './Bar';
import type { LegendPayload } from '../component/DefaultLegendContent';
import {
  useMouseClickItemDispatch,
  useMouseEnterItemDispatch,
  useMouseLeaveItemDispatch,
} from '../context/tooltipContext';
import { TooltipPayloadConfiguration } from '../state/tooltipSlice';
import { SetTooltipEntrySettings } from '../state/SetTooltipEntrySettings';
import { GraphicalItemClipPath, useNeedsClip } from './GraphicalItemClipPath';
import { useChartLayout } from '../context/chartLayoutContext';
import { selectWaterfallRectangles, WaterfallRectangleItem } from '../state/selectors/waterfallSelectors';
import { useAppSelector } from '../state/hooks';
import { useIsPanorama } from '../context/PanoramaContext';
import { selectActiveTooltipDataKey, selectActiveTooltipIndex } from '../state/selectors/tooltipSelectors';
import { SetLegendPayload } from '../state/SetLegendPayload';
import { resolveDefaultProps } from '../util/resolveDefaultProps';
import { RegisterGraphicalItemId } from '../context/RegisterGraphicalItemId';
import { SetCartesianGraphicalItem } from '../state/SetGraphicalItem';
import { svgPropertiesNoEvents } from '../util/svgPropertiesNoEvents';
import { ZIndexLayer } from '../zIndex/ZIndexLayer';
import { DefaultZIndexes } from '../zIndex/DefaultZIndexes';
import { propsAreEqual } from '../util/propsAreEqual';
import { AxisId } from '../state/cartesianAxisSlice';
import { GraphicalItemId } from '../state/graphicalItemsSlice';

export type WaterfallBarShapeProps = BarShapeProps;

interface WaterfallBarProps<DataPointType, ValueAxisType> extends DataConsumer<DataPointType, ValueAxisType> {
  className?: string;
  index?: Key;
  xAxisId?: AxisId;
  yAxisId?: AxisId;
  barSize?: string | number;
  unit?: string | number;
  name?: string | number;
  tooltipType?: TooltipType;
  legendType?: LegendType;
  hide?: boolean;
  shape?: ActiveShape<WaterfallBarShapeProps, SVGPathElement>;
  activeBar?: ActiveShape<WaterfallBarShapeProps, SVGPathElement>;
  /**
   * Fill color for positive increment bars.
   * @defaultValue '#4caf50'
   */
  positiveFill?: string;
  /**
   * Fill color for negative increment bars.
   * @defaultValue '#f44336'
   */
  negativeFill?: string;
  /**
   * Fill color for total/summary bars.
   * @defaultValue '#2196f3'
   */
  totalFill?: string;
  /**
   * Starting cumulative value for the waterfall chart.
   * When set, the first bar starts from this value instead of 0.
   * @defaultValue 0
   */
  initialValue?: number;
  /**
   * Whether to show connector lines between bars.
   * @defaultValue true
   */
  showConnectors?: boolean;
  /**
   * Style for connector lines.
   */
  connectorStyle?: React.SVGProps<SVGLineElement>;
  /**
   * If set false, animation of bar will be disabled.
   * @defaultValue false
   */
  isAnimationActive?: boolean;
  id?: string;
  label?: ImplicitLabelListType;
  zIndex?: number;
  maxBarSize?: number;
}

type InternalWaterfallBarProps = {
  layout: 'horizontal' | 'vertical';
  data: ReadonlyArray<WaterfallRectangleItem> | undefined;
  xAxisId: string | number;
  yAxisId: string | number;
  hide: boolean;
  legendType: LegendType;
  isAnimationActive: boolean;
  positiveFill: string;
  negativeFill: string;
  totalFill: string;
  showConnectors: boolean;
  connectorStyle: React.SVGProps<SVGLineElement>;
  needClip?: boolean;
  className?: string;
  index?: Key;
  barSize?: string | number;
  unit?: string | number;
  name?: string | number;
  dataKey?: DataKey<any>;
  tooltipType?: TooltipType;
  maxBarSize?: number;
  shape?: ActiveShape<WaterfallBarShapeProps, SVGPathElement>;
  activeBar?: ActiveShape<WaterfallBarShapeProps, SVGPathElement>;
  id: GraphicalItemId;
  label?: ImplicitLabelListType;
  initialValue: number | undefined;
};

type WaterfallBarSvgProps = Omit<
  PresentationAttributesAdaptChildEvent<WaterfallRectangleItem, SVGPathElement>,
  'name' | 'ref'
>;

export type Props<DataPointType = any, ValueAxisType = any> = WaterfallBarProps<DataPointType, ValueAxisType> &
  Omit<WaterfallBarSvgProps, keyof WaterfallBarProps<DataPointType, ValueAxisType>>;

type InternalProps = WaterfallBarSvgProps & InternalWaterfallBarProps;

const computeLegendPayloadFromWaterfallData = (props: Props): ReadonlyArray<LegendPayload> => {
  const { dataKey, name, positiveFill, negativeFill, totalFill, legendType, hide } = props;
  const baseName = getTooltipNameProp(name, dataKey);
  return [
    {
      inactive: hide,
      dataKey,
      type: legendType,
      color: positiveFill,
      value: `${baseName} (positive)`,
      payload: props,
    },
    {
      inactive: hide,
      dataKey,
      type: legendType,
      color: negativeFill,
      value: `${baseName} (negative)`,
      payload: props,
    },
    {
      inactive: hide,
      dataKey,
      type: legendType,
      color: totalFill,
      value: `${baseName} (total)`,
      payload: props,
    },
  ];
};

const SetWaterfallTooltipEntrySettings = React.memo(
  ({
    dataKey,
    stroke,
    strokeWidth,
    positiveFill,
    negativeFill,
    totalFill,
    name,
    hide,
    unit,
    tooltipType,
    id,
    rects,
  }: Pick<
    InternalProps,
    | 'dataKey'
    | 'stroke'
    | 'strokeWidth'
    | 'positiveFill'
    | 'negativeFill'
    | 'totalFill'
    | 'name'
    | 'hide'
    | 'unit'
    | 'tooltipType'
    | 'id'
  > & {
    rects: ReadonlyArray<WaterfallRectangleItem> | undefined;
  }) => {
    // Build dataDefinedOnItem with per-entry fill/color info so tooltip shows correct color
    const fillColor = (entry: WaterfallRectangleItem) => {
      if (entry.isTotal) return totalFill;
      if (entry.isPositive) return positiveFill;
      return negativeFill;
    };
    const dataDefinedOnItem = rects?.map(entry => ({
      ...entry.payload,
      fill: fillColor(entry),
      color: fillColor(entry),
      isPositive: entry.isPositive,
      isTotal: entry.isTotal,
    }));

    const tooltipEntrySettings: TooltipPayloadConfiguration = {
      dataDefinedOnItem,
      getPosition: noop,
      settings: {
        stroke,
        strokeWidth,
        fill: positiveFill,
        dataKey,
        nameKey: undefined,
        name: getTooltipNameProp(name, dataKey),
        hide,
        type: tooltipType,
        color: positiveFill,
        unit,
        graphicalItemId: id,
      },
    };
    return <SetTooltipEntrySettings tooltipEntrySettings={tooltipEntrySettings} />;
  },
);

/**
 * Render connector lines between adjacent waterfall bars.
 * Connectors are dashed horizontal lines that visually connect the end of one bar
 * to the start of the next bar.
 */
function WaterfallConnectors({
  data,
  layout,
  connectorStyle,
}: {
  data: ReadonlyArray<WaterfallRectangleItem> | undefined;
  layout: 'horizontal' | 'vertical';
  connectorStyle: React.SVGProps<SVGLineElement>;
}) {
  if (!data || data.length < 2) {
    return null;
  }

  const lines: ReactElement[] = [];

  for (let i = 0; i < data.length - 1; i++) {
    const current = data[i]!;
    const next = data[i + 1]!;

    // Skip if next is a total bar (it starts from 0, no connector needed)
    if (next.isTotal) {
      continue;
    }

    let x1: number, y1: number, x2: number, y2: number;

    if (layout === 'horizontal') {
      // Horizontal layout: bars go up/down, connector is a horizontal line
      // from the right edge of current bar to the left edge of next bar
      // at the cumulative end height of current bar
      const connectY = current.isPositive ? current.y : current.y + current.height;
      x1 = current.x + current.width;
      y1 = connectY;
      x2 = next.x;
      y2 = connectY;
    } else {
      // Vertical layout: bars go left/right, connector is a vertical line
      const connectX = current.isPositive ? current.x + current.width : current.x;
      x1 = connectX;
      y1 = current.y + current.height;
      x2 = connectX;
      y2 = next.y;
    }

    lines.push(
      <line
        key={`waterfall-connector-${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#555"
        strokeDasharray="6 3"
        strokeWidth={2}
        {...connectorStyle}
      />,
    );
  }

  return <Layer>{lines}</Layer>;
}

type WaterfallBarRectanglesProps = InternalProps & {
  data: ReadonlyArray<WaterfallRectangleItem> | undefined;
};

function WaterfallLabelListProvider({
  showLabels,
  children,
  rects,
}: {
  showLabels: boolean;
  children: ReactNode;
  rects: ReadonlyArray<WaterfallRectangleItem> | undefined;
}) {
  const labelListEntries: ReadonlyArray<CartesianLabelListEntry> | undefined = rects?.map(
    (entry: WaterfallRectangleItem): CartesianLabelListEntry => {
      const viewBox: TrapezoidViewBox = {
        x: entry.x,
        y: entry.y,
        width: entry.width,
        lowerWidth: entry.width,
        upperWidth: entry.width,
        height: entry.height,
      };
      return {
        ...viewBox,
        value: entry.value,
        payload: entry.payload,
        parentViewBox: entry.parentViewBox,
        viewBox,
        fill: entry.fill,
      };
    },
  );

  return (
    <CartesianLabelListContextProvider value={showLabels ? labelListEntries : undefined}>
      {children}
    </CartesianLabelListContextProvider>
  );
}

function WaterfallBarRectangles({
  data,
  props,
}: {
  data: ReadonlyArray<WaterfallRectangleItem> | undefined;
  props: WaterfallBarRectanglesProps;
}) {
  const { id, ...baseProps } = svgPropertiesNoEvents(props) ?? {};
  const { shape, dataKey, activeBar, positiveFill, negativeFill, totalFill } = props;

  const {
    onMouseEnter: onMouseEnterFromProps,
    onClick: onItemClickFromProps,
    onMouseLeave: onMouseLeaveFromProps,
  } = props;

  const onMouseEnterFromContext = useMouseEnterItemDispatch(onMouseEnterFromProps, dataKey, id);
  const onMouseLeaveFromContext = useMouseLeaveItemDispatch(onMouseLeaveFromProps);
  const onClickFromContext = useMouseClickItemDispatch(onItemClickFromProps, dataKey, id);

  const activeIndex = useAppSelector(selectActiveTooltipIndex);
  const activeDataKey = useAppSelector(selectActiveTooltipDataKey);

  if (!data) {
    return null;
  }

  return (
    <>
      {data.map((entry: WaterfallRectangleItem, i: number) => {
        // Determine fill color based on bar type
        let fillColor: string;
        if (entry.isTotal) {
          fillColor = totalFill;
        } else if (entry.isPositive) {
          fillColor = positiveFill;
        } else {
          fillColor = negativeFill;
        }

        const isActive =
          activeBar &&
          String(entry.originalDataIndex) === activeIndex &&
          (activeDataKey == null || dataKey === activeDataKey);

        const activeOption = (() => {
          if (!isActive) return shape;
          if (activeBar === true) return shape;
          return activeBar;
        })();
        const barRectangleProps: BarRectangleProps = {
          option: activeOption,
          isActive: !!isActive,
          ...baseProps,
          name: String(baseProps.name),
          // radius from svg props can be string, but BarRectangleProps expects RectRadius
          radius: typeof baseProps.radius === 'string' ? undefined : baseProps.radius,
          ...entry,
          fill: fillColor,
          dataKey,
          index: i,
          className: 'recharts-waterfall-bar-rectangle',
          onMouseEnter: onMouseEnterFromContext(entry, i),
          onMouseLeave: onMouseLeaveFromContext(entry, i),
          onClick: onClickFromContext(entry, i),
        };

        return (
          <BarRectangle
            key={`waterfall-rectangle-${entry?.x}-${entry?.y}-${entry?.value}-${i}`}
            {...barRectangleProps}
          />
        );
      })}
    </>
  );
}

class WaterfallBarWithState extends PureComponent<InternalProps> {
  render() {
    const { hide, data, className, xAxisId, yAxisId, needClip, id, layout, showConnectors, connectorStyle } =
      this.props;
    if (hide || data == null) {
      return null;
    }

    const layerClass = clsx('recharts-waterfall', className);
    const clipPathId = id;

    return (
      <Layer className={layerClass} id={id}>
        {needClip && (
          <defs>
            <GraphicalItemClipPath clipPathId={clipPathId} xAxisId={xAxisId} yAxisId={yAxisId} />
          </defs>
        )}
        <Layer className="recharts-waterfall-bars" clipPath={needClip ? `url(#clipPath-${clipPathId})` : undefined}>
          <WaterfallBarRectangles data={data} props={this.props} />
          {showConnectors && <WaterfallConnectors data={data} layout={layout} connectorStyle={connectorStyle} />}
        </Layer>
      </Layer>
    );
  }
}

export const defaultWaterfallBarProps = {
  activeBar: false,
  hide: false,
  isAnimationActive: false,
  legendType: 'rect' as const,
  positiveFill: '#4caf50',
  negativeFill: '#f44336',
  totalFill: '#2196f3',
  showConnectors: true,
  connectorStyle: {},
  xAxisId: 0,
  yAxisId: 0,
  zIndex: DefaultZIndexes.waterfallBar,
  initialValue: undefined,
} as const satisfies Partial<Props>;

type WaterfallBarImplProps = Omit<InternalWaterfallBarProps, 'layout' | 'data'> & { children?: ReactNode };

function WaterfallBarImpl(props: WaterfallBarImplProps) {
  const {
    xAxisId,
    yAxisId,
    hide,
    legendType,
    positiveFill,
    negativeFill,
    totalFill,
    showConnectors,
    connectorStyle,
    isAnimationActive,
  } = props;

  const { needClip } = useNeedsClip(xAxisId, yAxisId);
  const layout = useChartLayout();
  const isPanorama = useIsPanorama();

  const cells = findAllByType(props.children, Cell);

  const rects: ReadonlyArray<WaterfallRectangleItem> | undefined = useAppSelector(state =>
    selectWaterfallRectangles(state, props.id, isPanorama, cells),
  );

  if (layout !== 'vertical' && layout !== 'horizontal') {
    return null;
  }

  return (
    <WaterfallLabelListProvider showLabels rects={rects}>
      <SetWaterfallTooltipEntrySettings
        dataKey={props.dataKey}
        stroke={(props as any).stroke}
        strokeWidth={(props as any).strokeWidth}
        positiveFill={positiveFill}
        negativeFill={negativeFill}
        totalFill={totalFill}
        name={props.name}
        hide={hide}
        unit={props.unit}
        tooltipType={props.tooltipType}
        id={props.id}
        rects={rects}
      />
      <WaterfallBarWithState
        {...props}
        layout={layout}
        needClip={needClip}
        data={rects}
        xAxisId={xAxisId}
        yAxisId={yAxisId}
        hide={hide}
        legendType={legendType}
        positiveFill={positiveFill}
        negativeFill={negativeFill}
        totalFill={totalFill}
        showConnectors={showConnectors}
        connectorStyle={connectorStyle}
        isAnimationActive={isAnimationActive}
      />
      <LabelListFromLabelProp label={props.label} />
    </WaterfallLabelListProvider>
  );
}

function WaterfallBarFn(outsideProps: Props) {
  const props = resolveDefaultProps(outsideProps, defaultWaterfallBarProps);
  const isPanorama = useIsPanorama();

  return (
    <RegisterGraphicalItemId id={props.id} type="waterfall">
      {id => (
        <>
          <SetLegendPayload legendPayload={computeLegendPayloadFromWaterfallData(props)} />
          <SetCartesianGraphicalItem
            type="waterfall"
            id={id}
            data={undefined}
            xAxisId={props.xAxisId}
            yAxisId={props.yAxisId}
            zAxisId={0}
            dataKey={props.dataKey}
            stackId={undefined}
            barSize={props.barSize}
            hide={props.hide}
            minPointSize={0}
            maxBarSize={props.maxBarSize}
            isPanorama={isPanorama}
            hasCustomShape={props.shape != null}
            initialValue={props.initialValue}
          />
          <ZIndexLayer zIndex={props.zIndex}>
            <WaterfallBarImpl {...props} id={id} />
          </ZIndexLayer>
        </>
      )}
    </RegisterGraphicalItemId>
  );
}

/**
 * @provides LabelListContext
 * @consumes CartesianChartContext
 */
export const WaterfallBar = React.memo(WaterfallBarFn, propsAreEqual) as <DataPointType = any, ValueAxisType = any>(
  props: Props<DataPointType, ValueAxisType>,
) => ReactElement;
// @ts-expect-error we need to set the displayName for debugging purposes
WaterfallBar.displayName = 'WaterfallBar';

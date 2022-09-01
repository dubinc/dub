import { useMemo, useState } from "react";
import { RawStatsProps } from "@/lib/stats";
import { scaleQuantize } from "@visx/scale";
import { Mercator } from "@visx/geo";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { withScreenSize } from "@visx/responsive";
import { nFormatter } from "@/lib/utils";
import styles from "./index.module.css";
import * as topojson from "topojson-client";
import topology from "@/data/world-topo.json";

const CHART_MAX_HEIGHT = 400;
const CHART_MAX_WIDTH = 800;

interface FeatureShape {
  type: "Feature";
  id: string;
  geometry: { coordinates: [number, number][][]; type: "Polygon" };
  properties: { name: string };
}

type TooltipData = {
  country: string;
  count: number;
};

const StatsMap = ({
  _key,
  stats,
  screenWidth,
  screenHeight,
}: {
  _key: string;
  stats: RawStatsProps[];
  screenWidth?: number;
  screenHeight?: number;
}) => {
  const [CHART_WIDTH, CHART_HEIGHT] = useMemo(() => {
    const width = screenWidth
      ? Math.min(screenWidth * 0.8, CHART_MAX_WIDTH)
      : CHART_MAX_WIDTH;
    const height = screenHeight
      ? Math.min(screenHeight * 0.4, CHART_MAX_HEIGHT)
      : CHART_MAX_HEIGHT;
    return [width, height];
  }, [screenWidth, screenHeight]);

  // @ts-ignore
  const world = topojson.feature(topology, topology.objects.units) as {
    type: "FeatureCollection";
    features: FeatureShape[];
  };

  let tooltipTimeout: number | undefined;

  const mock = [
    { country: "USA", count: 400 },
    { country: "CHN", count: 200 },
    { country: "JPN", count: 300 },
    { country: "DEU", count: 100 },
  ];

  const color = scaleQuantize({
    domain: [0, Math.max(...mock.map((d) => d.count))],
    range: [
      "#c6dbef",
      "#9ecae1",
      "#6baed6",
      "#4292c6",
      "#2171b5",
      "#08519c",
      "#08306b",
    ],
  });

  const centerX = CHART_WIDTH / 2;
  const centerY = CHART_HEIGHT / 2;
  const scale = (CHART_WIDTH / 630) * 100;

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
    detectBounds: true,
  });
  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft = 0,
    tooltipTop = 0,
  } = useTooltip<TooltipData>();

  return (
    <div
      className="relative"
      ref={containerRef}
      style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}
    >
      {!!tooltipOpen && !!tooltipData && (
        <>
          <TooltipInPortal
            key={Math.random()} // needed for bounds to update correctly
            left={tooltipLeft}
            top={tooltipTop}
            className={styles.tooltip}
          >
            <div className="text-center">
              <h3 className="text-black dark:text-white my-1">
                <span className="text-2xl font-semibold">
                  {nFormatter(tooltipData.count)}
                </span>{" "}
                clicks
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {tooltipData.country}
              </p>
            </div>
          </TooltipInPortal>
        </>
      )}
      <svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <rect
          x={0}
          y={0}
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          fill="transparent"
        />
        <Mercator
          data={world.features}
          scale={scale}
          translate={[centerX, centerY + 50]}
        >
          {(mercator) => (
            <g>
              {mercator.features.map(({ feature, path }, i) => {
                const [hovered, setHovered] = useState(false);
                return (
                  <path
                    key={`map-feature-${i}`}
                    d={path || ""}
                    fill={color(
                      mock.find((d) => d.country === feature.id)?.count || 0
                    )}
                    stroke={hovered ? "#08306b" : "white"}
                    strokeWidth={hovered ? 3 : 0.5}
                    onMouseLeave={() => {
                      setHovered(false);
                      tooltipTimeout = window.setTimeout(() => {
                        hideTooltip();
                      }, 300);
                    }}
                    onMouseMove={(event) => {
                      setHovered(true);
                      if (tooltipTimeout) clearTimeout(tooltipTimeout);
                      const eventSvgCoords = localPoint(event) ?? {
                        x: 0,
                        y: 0,
                      };
                      showTooltip({
                        tooltipData: {
                          country: feature.properties?.name,
                          count:
                            mock.find((d) => d.country === feature.id)?.count ||
                            0,
                        },
                        tooltipTop: eventSvgCoords?.y - 115,
                        tooltipLeft: eventSvgCoords?.x - 115,
                      });
                    }}
                  />
                );
              })}
            </g>
          )}
        </Mercator>
      </svg>
    </div>
  );
};

// @ts-ignore
export default withScreenSize(StatsMap);

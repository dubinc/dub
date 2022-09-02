import { useState } from "react";
import Pie, { ProvidedProps, PieArcDatum } from "@visx/shape/lib/shapes/Pie";

export default function Devices() {
  const [width, height] = [350, 350];

  const [selectedBrowser, setSelectedBrowser] = useState<string | null>(null);

  if (width < 10) return null;

  const donutThickness = 50;

  return (
    <div className="bg-white dark:bg-black px-7 py-5 shadow-lg dark:shadow-none rounded-lg border border-gray-100 dark:border-gray-600">
      <div className="mb-5 text-left">
        <h1 className="text-2xl dark:text-white font-semibold">Devices</h1>
      </div>
      <figure>
        <svg width={width} height={height}>
          {/* <Pie
          data={
            selectedBrowser ? browsers.filter(({ label }) => label === selectedBrowser) : browsers
          }
          pieValue={usage}
          outerRadius={radius}
          innerRadius={radius - donutThickness}
          cornerRadius={3}
          padAngle={0.005}
        >
          {(pie) => (
            <AnimatedPie<BrowserUsage>
              {...pie}
              animate={animate}
              getKey={(arc) => arc.data.label}
              onClickDatum={({ data: { label } }) =>
                animate &&
                setSelectedBrowser(selectedBrowser && selectedBrowser === label ? null : label)
              }
              getColor={(arc) => getBrowserColor(arc.data.label)}
            />
          )}
        </Pie> */}
        </svg>
      </figure>
    </div>
  );
}

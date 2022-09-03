import { useState } from "react";
import Pie, { ProvidedProps, PieArcDatum } from "@visx/shape/lib/shapes/Pie";

export default function PieChart() {
  const [width, height] = [350, 350];

  const [selectedBrowser, setSelectedBrowser] = useState<string | null>(null);

  const donutThickness = 50;

  return (
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
  );
}

import { Pie } from "@visx/shape";

type PieChartData = {
  name: string;
  value: number;
  color: string;
};

export default function SimplePieChart({ data }: { data: PieChartData[] }) {
  return (
    <svg width={40} height={40}>
      <g transform={`translate(20, 20)`}>
        <Pie
          data={data}
          pieValue={(d) => d.value}
          outerRadius={16}
          innerRadius={10}
          cornerRadius={2}
          padAngle={0.02}
          pieSortValues={() => -1}
        >
          {(pie) => {
            return pie.arcs.map((arc, index) => {
              return (
                <g key={`arc-${arc.data.name.toLowerCase()}-${index}`}>
                  <path
                    d={pie.path(arc) || ""}
                    fill="currentColor"
                    className={arc.data.color}
                    stroke="white"
                    strokeWidth={1}
                    strokeLinecap="round"
                  />
                </g>
              );
            });
          }}
        </Pie>
      </g>
    </svg>
  );
}

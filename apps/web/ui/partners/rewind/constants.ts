export const REWIND_YEAR = 2025;

export const REWIND_ASSETS_PATH =
  "https://assets.dub.co/misc/partner-rewind-2025";

export const REWIND_EARNINGS_MINIMUM = 10_00; // $10

export const REWIND_STEPS: {
  id: string;
  percentileId: string;
  label: string;
  valueType: "number" | "currency";
  image: string;
  video: string;
}[] = [
  {
    id: "totalEarnings",
    percentileId: "earningsPercentile",
    label: "Total earnings",
    valueType: "currency",
    image: "earning.png",
    video: "earning.webm",
  },
  {
    id: "totalClicks",
    percentileId: "clicksPercentile",
    label: "Links clicked",
    valueType: "number",
    image: "click.png",
    video: "click.webm",
  },
  {
    id: "totalLeads",
    percentileId: "leadsPercentile",
    label: "Leads generated",
    valueType: "number",
    image: "lead.png",
    video: "lead.webm",
  },
  {
    id: "totalRevenue",
    percentileId: "revenuePercentile",
    label: "Revenue generated",
    valueType: "currency",
    image: "revenue.png",
    video: "revenue.webm",
  },
];

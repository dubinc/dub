export const REWIND_ASSETS_PATH =
  "https://assets.dub.co/misc/partner-rewind-2025";

export const REWIND_STEPS: {
  id: string;
  percentileId: string;
  label: string;
  valueType: "number" | "currency";
  video: string;
}[] = [
  {
    id: "totalEarnings",
    percentileId: "earningsPercentile",
    label: "Total earnings",
    valueType: "currency",
    video: "earning.webm",
  },
  {
    id: "totalClicks",
    percentileId: "clicksPercentile",
    label: "Total clicks",
    valueType: "number",
    video: "click.webm",
  },
  {
    id: "totalLeads",
    percentileId: "leadsPercentile",
    label: "Total leads",
    valueType: "number",
    video: "lead.webm",
  },
  {
    id: "totalRevenue",
    percentileId: "revenuePercentile",
    label: "Total revenue",
    valueType: "currency",
    video: "revenue.webm",
  },
];

export type CommissionStatus = "pending" | "processed" | "paid";
export type CommissionStatusFilter = CommissionStatus;

export const MOCK_COMMISSION_TOTALS: Record<CommissionStatus, number> = {
  pending: 203120, // $2,031.20
  processed: 165300, // $1,653.00
  paid: 8450600, // $84,506.00
};

function makeDate(daysAgo: number): Date {
  const d = new Date("2026-04-22T00:00:00Z");
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export const MOCK_COMMISSIONS_TIMESERIES: {
  start: Date;
  pending: number;
  processed: number;
  paid: number;
}[] = [
  { start: makeDate(89), pending: 3200, processed: 2800, paid: 142000 },
  { start: makeDate(86), pending: 5100, processed: 4600, paid: 231000 },
  { start: makeDate(83), pending: 7400, processed: 6200, paid: 418000 },
  { start: makeDate(80), pending: 6100, processed: 5400, paid: 356000 },
  { start: makeDate(77), pending: 9800, processed: 8700, paid: 573000 },
  { start: makeDate(74), pending: 7600, processed: 6900, paid: 492000 },
  { start: makeDate(71), pending: 4300, processed: 3800, paid: 218000 },
  { start: makeDate(68), pending: 11200, processed: 9800, paid: 687000 },
  { start: makeDate(65), pending: 8900, processed: 7800, paid: 534000 },
  { start: makeDate(62), pending: 6700, processed: 5900, paid: 371000 },
  { start: makeDate(59), pending: 13400, processed: 11800, paid: 762000 },
  { start: makeDate(56), pending: 10600, processed: 9300, paid: 628000 },
  { start: makeDate(53), pending: 8200, processed: 7200, paid: 487000 },
  { start: makeDate(50), pending: 14800, processed: 13100, paid: 843000 },
  { start: makeDate(47), pending: 12300, processed: 10800, paid: 714000 },
  { start: makeDate(44), pending: 9700, processed: 8500, paid: 578000 },
  { start: makeDate(41), pending: 7300, processed: 6400, paid: 428000 },
  { start: makeDate(38), pending: 16500, processed: 14600, paid: 956000 },
  { start: makeDate(35), pending: 14100, processed: 12400, paid: 832000 },
  { start: makeDate(32), pending: 11400, processed: 10000, paid: 674000 },
  { start: makeDate(29), pending: 18900, processed: 16700, paid: 1090000 },
  { start: makeDate(26), pending: 15800, processed: 13900, paid: 931000 },
  { start: makeDate(23), pending: 12700, processed: 11200, paid: 756000 },
  { start: makeDate(20), pending: 21600, processed: 19100, paid: 1270000 },
  { start: makeDate(17), pending: 18400, processed: 16200, paid: 1084000 },
  { start: makeDate(14), pending: 14800, processed: 13000, paid: 862000 },
  { start: makeDate(11), pending: 24300, processed: 21500, paid: 1430000 },
  { start: makeDate(8), pending: 20600, processed: 18200, paid: 1214000 },
  { start: makeDate(5), pending: 16700, processed: 14700, paid: 993000 },
  { start: makeDate(2), pending: 27400, processed: 24200, paid: 1580000 },
];

export interface MockCommissionPartner {
  id: string;
  name: string;
  image: string;
  groupName: string;
  groupColor: string;
  country: string;
  countryCode: string;
  earnings: number;
}

export const MOCK_COMMISSION_PARTNERS: MockCommissionPartner[] = [
  {
    id: "1",
    name: "Mia Thompson",
    image: `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=MiaThompson`,
    groupName: "Group 1",
    groupColor: "#f97316",
    country: "United States",
    countryCode: "us",
    earnings: 190000,
  },
  {
    id: "2",
    name: "Steven Smith",
    image: `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=StevenSmith`,
    groupName: "Group 3",
    groupColor: "#8b5cf6",
    country: "Canada",
    countryCode: "ca",
    earnings: 140000,
  },
  {
    id: "3",
    name: "Ethan Carter",
    image: `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=EthanCarter`,
    groupName: "Group 1",
    groupColor: "#f97316",
    country: "United States",
    countryCode: "us",
    earnings: 45900,
  },
  {
    id: "4",
    name: "Olivia Carter",
    image: `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=OliviaCarter`,
    groupName: "Group 3",
    groupColor: "#8b5cf6",
    country: "United States",
    countryCode: "us",
    earnings: 40900,
  },
  {
    id: "5",
    name: "Liam Johnson",
    image: `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=LiamJohnson`,
    groupName: "Group 1",
    groupColor: "#f97316",
    country: "Brazil",
    countryCode: "br",
    earnings: 36000,
  },
  {
    id: "6",
    name: "Ella Nakatsu",
    image: `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=EllaNakatsu`,
    groupName: "Group 1",
    groupColor: "#f97316",
    country: "United States",
    countryCode: "us",
    earnings: 34900,
  },
  {
    id: "7",
    name: "Noah Brown",
    image: `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=NoahBrown`,
    groupName: "Group 2",
    groupColor: "#6366f1",
    country: "Canada",
    countryCode: "ca",
    earnings: 27700,
  },
  {
    id: "8",
    name: "Ava Wilson",
    image: `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=AvaWilson`,
    groupName: "Group 1",
    groupColor: "#f97316",
    country: "United States",
    countryCode: "us",
    earnings: 38000,
  },
  {
    id: "9",
    name: "Ethan Davis",
    image: `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=EthanDavis`,
    groupName: "Group 2",
    groupColor: "#6366f1",
    country: "Germany",
    countryCode: "de",
    earnings: 34900,
  },
  {
    id: "10",
    name: "Sophia Garcia",
    image: `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=SophiaGarcia`,
    groupName: "Group 2",
    groupColor: "#6366f1",
    country: "United Kingdom",
    countryCode: "gb",
    earnings: 27700,
  },
];

export const MOCK_GROUP_BREAKDOWN: {
  label: string;
  value: number;
  color: string;
}[] = [
  { label: "Group1", value: 2634, color: "#f97316" },
  { label: "Group2", value: 1987, color: "#6366f1" },
  { label: "Group3", value: 1456, color: "#8b5cf6" },
  { label: "Group4", value: 1234, color: "#06b6d4" },
  { label: "Group5", value: 987, color: "#22c55e" },
  { label: "Group6", value: 654, color: "#f43f5e" },
  { label: "Group7", value: 654, color: "#a8a29e" },
];

export const MOCK_LOCATION_BREAKDOWN: {
  label: string;
  value: number;
  countryCode: string;
}[] = [
  { label: "United States", value: 3891, countryCode: "us" },
  { label: "Canada", value: 1241, countryCode: "ca" },
  { label: "United Kingdom", value: 876, countryCode: "gb" },
  { label: "Germany", value: 743, countryCode: "de" },
  { label: "Brazil", value: 612, countryCode: "br" },
  { label: "Australia", value: 489, countryCode: "au" },
  { label: "France", value: 421, countryCode: "fr" },
];

export const MOCK_TYPE_BREAKDOWN: {
  label: string;
  value: number;
  type: string;
}[] = [
  { label: "Sale", value: 193300, type: "sale" },
  { label: "Custom", value: 130600, type: "custom" },
  { label: "Lead", value: 1700, type: "lead" },
  { label: "Click", value: 100, type: "click" },
];

export const MOCK_CUSTOMER_BREAKDOWN: { label: string; value: number }[] = [
  { label: "Acme Corp", value: 48200 },
  { label: "Globex Inc", value: 36700 },
  { label: "Initech", value: 28900 },
  { label: "Umbrella Co", value: 21400 },
  { label: "Stark Industries", value: 18600 },
  { label: "Wayne Enterprises", value: 14300 },
  { label: "Oscorp", value: 9800 },
];

export const MOCK_COUNTRY_BREAKDOWN: {
  label: string;
  value: number;
  countryCode: string;
}[] = [
  { label: "United States", value: 127400, countryCode: "us" },
  { label: "Canada", value: 41200, countryCode: "ca" },
  { label: "United Kingdom", value: 28900, countryCode: "gb" },
  { label: "Germany", value: 24300, countryCode: "de" },
  { label: "Brazil", value: 19800, countryCode: "br" },
  { label: "Australia", value: 16400, countryCode: "au" },
  { label: "France", value: 13700, countryCode: "fr" },
];

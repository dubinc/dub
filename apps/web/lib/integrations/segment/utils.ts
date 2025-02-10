export const createSegmentBasicAuthHeader = (writeKey: string) => {
  return `Basic ${Buffer.from(`${writeKey}:`).toString("base64")}`;
};

export const segmentRegions = [
  {
    name: "Oregon (US Default)",
    value: "us-west-2",
    url: "https://api.segment.io/v1/track",
  },
  {
    name: "Dublin",
    value: "eu-west-1",
    url: "https://events.eu1.segmentapis.com/v1/track",
  },
];

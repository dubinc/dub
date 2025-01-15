export const createSegmentBasicAuthHeader = (writeKey: string) => {
  return `Basic ${Buffer.from(`${writeKey}:`).toString("base64")}`;
};

export const regionToUrl = {
  "us-west-2": "https://api.segment.io/v1/track",
  "eu-west-1": "https://events.eu1.segmentapis.com/v1/track",
};

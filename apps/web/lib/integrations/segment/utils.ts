export const createSegmentBasicAuthHeader = (writeKey: string) => {
  return `Basic ${Buffer.from(`${writeKey}:`).toString("base64")}`;
};

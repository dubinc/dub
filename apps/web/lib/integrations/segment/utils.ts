export const createSegmentBasicAuthHeader = (writeKey: string) => {
  const encoded = Buffer.from(`${writeKey}:`).toString("base64");

  return `Basic ${encoded}`;
};

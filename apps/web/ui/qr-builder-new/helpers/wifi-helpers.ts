
export const escapeWiFiValue = (value: string): string => {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/"/g, '\\"')
    .replace(/:/g, "\\:");
};


export const unescapeWiFiValue = (value: string): string => {
  return value
    .replace(/\\:/g, ":")
    .replace(/\\"/g, '"')
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
};

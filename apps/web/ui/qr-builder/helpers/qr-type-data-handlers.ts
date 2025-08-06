import { EQRType } from "../constants/get-qr-config.ts";

// Function to escape special characters in Wi-Fi QR code
const escapeWiFiValue = (value: string): string => {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/"/g, '\\"')
    .replace(/:/g, "\\:");
};

// Function to parse escaped values in Wi-Fi QR code
const unescapeWiFiValue = (value: string): string => {
  return value
    .replace(/\\:/g, ":")
    .replace(/\\"/g, '"')
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
};

export const qrTypeDataHandlers = {
  [EQRType.WEBSITE]: (values: Record<string, string>) => {
    return values.websiteLink;
  },
  [EQRType.APP_LINK]: (values: Record<string, string>) => {
    return values.storeLink;
  },
  [EQRType.SOCIAL]: (values: Record<string, string>) => {
    return values.socialLink;
  },
  [EQRType.FEEDBACK]: (values: Record<string, string>) => {
    return values.link;
  },
  [EQRType.WHATSAPP]: (values: Record<string, string>) => {
    const { number, message } = values;
    return message
      ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${number}`;
  },
  [EQRType.WIFI]: (
    values: Record<string, string>,
    isHiddenNetwork: boolean,
  ) => {
    const networkEncryption = escapeWiFiValue(
      values.networkEncryption || "WPA",
    );
    const networkName = escapeWiFiValue(values.networkName || "");
    const networkPassword = escapeWiFiValue(values.networkPassword || "");

    return `WIFI:T:${networkEncryption};S:${networkName};P:${networkPassword};H:${isHiddenNetwork};`;
  },
  [EQRType.PDF]: (values: Record<string, string>) => {
    return crypto.randomUUID();
  },
  [EQRType.IMAGE]: (values: Record<string, string>) => {
    return crypto.randomUUID();
  },
  [EQRType.VIDEO]: (values: Record<string, string>) => {
    return crypto.randomUUID();
  },
};

export { escapeWiFiValue, unescapeWiFiValue };

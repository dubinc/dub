import { EQRType } from "../constants/get-qr-config.ts";

export const qrTypeDataHandlers = {
  [EQRType.WEBSITE]: (
    values: Record<string, string>,
    isHiddenNetwork: boolean,
  ) => {
    return values.websiteLink;
  },
  [EQRType.APP_LINK]: (
    values: Record<string, string>,
    isHiddenNetwork: boolean,
  ) => {
    return values.storeLink;
  },
  [EQRType.SOCIAL]: (
    values: Record<string, string>,
    isHiddenNetwork: boolean,
  ) => {
    return values.socialLink;
  },
  [EQRType.FEEDBACK]: (
    values: Record<string, string>,
    isHiddenNetwork: boolean,
  ) => {
    return values.link;
  },
  [EQRType.WHATSAPP]: (
    values: Record<string, string>,
    isHiddenNetwork: boolean,
  ) => {
    const { number, message } = values;
    return message
      ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${number}`;
  },
  [EQRType.WIFI]: (
    values: Record<string, string>,
    isHiddenNetwork: boolean,
  ) => {
    return `WIFI:T:${values.networkEncryption};S:${values.networkName};P:${values.networkPassword};H:${isHiddenNetwork};`;
  },
};

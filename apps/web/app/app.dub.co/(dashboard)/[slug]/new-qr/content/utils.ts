import { EQRType } from "../../../../(public)/landing/constants/get-qr-config.ts";

export const getMaxSizeLabel = (qrType: EQRType, isLogo = false) => {
  if (isLogo && qrType === EQRType.IMAGE) {
    return { size: 2 * 1024 * 1024, label: "2MB" };
  }

  const maxSizes: Partial<Record<EQRType, { size: number; label: string }>> = {
    [EQRType.IMAGE]: { size: 15 * 1024 * 1024, label: "15MB" },
    [EQRType.VIDEO]: { size: 300 * 1024 * 1024, label: "300MB" },
    [EQRType.PDF]: { size: 100 * 1024 * 1024, label: "100MB written" },
  };

  return maxSizes[qrType] || { size: 0, label: "Unsupported size" };
};

export const dataHandlers = {
  [EQRType.WEBSITE]: (values: Record<string, string>, isHiddenNetwork: boolean) => {
    return values.websiteLink;
  },
  [EQRType.APP_LINK]: (values: Record<string, string>, isHiddenNetwork: boolean) => {
    return values.storeLink;
  },
  [EQRType.SOCIAL]: (values: Record<string, string>, isHiddenNetwork: boolean) => {
    return values.socialLink;
  },
  [EQRType.FEEDBACK]: (values: Record<string, string>, isHiddenNetwork: boolean) => {
    return values.storeLink;
  },
  [EQRType.WHATSAPP]: (values: Record<string, string>, isHiddenNetwork: boolean) => {
    return `https://wa.me/${values.number}?text=${encodeURIComponent(values.message)}`;
  },
  [EQRType.WIFI]: (values: Record<string, string>, isHiddenNetwork: boolean) => {
    const string = `WIFI:T:${values.networkEncryption};S:${values.networkName};P:${values.networkPassword};H:${isHiddenNetwork};`;
    console.log(string);
    return string;
  },
};

import {
  EQRType,
  FILE_QR_TYPES,
} from "@/ui/qr-builder/constants/get-qr-config.ts";

const isURL = (str: string): boolean => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

const parseFileQRData = (qrType: EQRType, data: string) => {
  if (!isURL(data)) {
    return {};
  }

  switch (qrType) {
    case EQRType.IMAGE:
      return { filesImage: data };
    case EQRType.PDF:
      return { filesPDF: data };
    case EQRType.VIDEO:
      return { filesVideo: data };
    default:
      return {};
  }
};

const parseWebsiteQRData = (data: string) => {
  return { websiteLink: data };
};

const parseWhatsAppQRData = (data: string) => {
  try {
    const url = new URL(data);
    const number = url.pathname.replace("/", "");
    const message = url.searchParams.get("text") || "";
    return { number, message };
  } catch {
    return { number: "", message: "" };
  }
};

const parseWiFiQRData = (data: string) => {
  const wifiMatch = data.match(
    /WIFI:T:([^;]+);S:([^;]+);P:([^;]+);H:([^;]+);?/,
  );

  if (wifiMatch) {
    return {
      networkName: wifiMatch[2],
    };
  }

  return { networkName: "" };
};

export const parseQRData = (qrType: EQRType, data: string) => {
  if (FILE_QR_TYPES.includes(qrType)) {
    return parseFileQRData(qrType, data);
  }

  switch (qrType) {
    case EQRType.WEBSITE:
      return parseWebsiteQRData(data);
    case EQRType.WHATSAPP:
      return parseWhatsAppQRData(data);
    case EQRType.WIFI:
      return parseWiFiQRData(data);
    default:
      return {};
  }
};

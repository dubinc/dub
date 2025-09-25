import { EQRType } from "../constants/get-qr-config";

// Function to escape special characters in Wi-Fi QR code
export const escapeWiFiValue = (value: string): string => {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/"/g, '\\"')
    .replace(/:/g, "\\:");
};

// Function to parse escaped values in Wi-Fi QR code
export const unescapeWiFiValue = (value: string): string => {
  return value
    .replace(/\\:/g, ":")
    .replace(/\\"/g, '"')
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
};

// Data encoders - convert form data to QR code data string
export const qrTypeDataEncoders = {
  [EQRType.WEBSITE]: (values: Record<string, any>) => {
    return values.websiteLink || "";
  },
  
  [EQRType.APP_LINK]: (values: Record<string, any>) => {
    return values.storeLink || "";
  },
  
  [EQRType.SOCIAL]: (values: Record<string, any>) => {
    return values.socialLink || "";
  },
  
  [EQRType.FEEDBACK]: (values: Record<string, any>) => {
    return values.link || "";
  },
  
  [EQRType.WHATSAPP]: (values: Record<string, any>) => {
    const { number, message } = values;
    if (!number) return "";
    
    // Clean and format the phone number
    const cleanNumber = number.replace(/\D/g, "");
    const formattedNumber = cleanNumber.startsWith("+") ? cleanNumber : `+${cleanNumber}`;
    
    return message && message.trim()
      ? `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message.trim())}`
      : `https://wa.me/${formattedNumber}`;
  },
  
  [EQRType.WIFI]: (values: Record<string, any>) => {
    const {
      networkEncryption = "WPA",
      networkName = "",
      networkPassword = "",
      isHiddenNetwork = false
    } = values;
    
    const encryptionType = escapeWiFiValue(networkEncryption);
    const ssid = escapeWiFiValue(networkName);
    const password = escapeWiFiValue(networkPassword);
    const hidden = Boolean(isHiddenNetwork);
    
    return `WIFI:T:${encryptionType};S:${ssid};P:${password};H:${hidden};`;
  },
  
  // For file types, we'll use the file URL if available, otherwise a placeholder
  // TODO: Replace all hardcoded storage URLs with NEXT_PUBLIC_STORAGE_BASE_URL environment variable
  // Use process.env.NEXT_PUBLIC_STORAGE_BASE_URL for client-side access to make URLs configurable
  // This affects PDF, IMAGE, and VIDEO QR types below
  [EQRType.PDF]: (values: Record<string, any>, fileId?: string) => {
    return fileId ? `https://assets.getqr.com/qrs-content/${fileId}` : "";
  },

  [EQRType.IMAGE]: (values: Record<string, any>, fileId?: string) => {
    return fileId ? `https://assets.getqr.com/qrs-content/${fileId}` : "";
  },
  
  [EQRType.VIDEO]: (values: Record<string, any>, fileId?: string) => {
    return fileId ? `https://assets.getqr.com/qrs-content/${fileId}` : "";
  },
};

// Data parsers - convert QR code data string back to form values
export const qrTypeDataParsers = {
  [EQRType.WEBSITE]: (data: string): Record<string, any> => {
    return { websiteLink: data };
  },
  
  [EQRType.APP_LINK]: (data: string): Record<string, any> => {
    return { storeLink: data };
  },
  
  [EQRType.SOCIAL]: (data: string): Record<string, any> => {
    return { socialLink: data };
  },
  
  [EQRType.FEEDBACK]: (data: string): Record<string, any> => {
    return { link: data };
  },
  
  [EQRType.WHATSAPP]: (data: string): Record<string, any> => {
    try {
      const url = new URL(data);
      let number = "";
      let message = "";

      if (url.hostname === "wa.me") {
        number = url.pathname.replace("/", "");
        const textParam = url.searchParams.get("text");
        message = textParam && textParam !== "undefined" 
          ? decodeURIComponent(textParam) 
          : "";
      } else if (url.hostname === "whatsapp.com" || url.hostname === "api.whatsapp.com") {
        number = url.searchParams.get("phone") || "";
        const textParam = url.searchParams.get("text");
        message = textParam && textParam !== "undefined" 
          ? decodeURIComponent(textParam) 
          : "";
      }

      // Clean number formatting
      number = number.replace(/\D/g, "");
      if (number && !number.startsWith("+")) {
        number = `+${number}`;
      }

      return { number, message };
    } catch (e) {
      // Fallback - try to extract number from string
      const numberMatch = data.match(/\d+/);
      if (numberMatch) {
        return {
          number: `+${numberMatch[0]}`,
          message: "",
        };
      }
      return { number: "", message: "" };
    }
  },
  
  [EQRType.WIFI]: (data: string): Record<string, any> => {
    const wifiMatch = data.match(
      /WIFI:T:([^;]+(?:\\;[^;]+)*);S:([^;]+(?:\\;[^;]+)*);P:([^;]+(?:\\;[^;]+)*);H:([^;]+(?:\\;[^;]+)*);/
    );
    
    if (wifiMatch) {
      return {
        networkEncryption: unescapeWiFiValue(wifiMatch[1]),
        networkName: unescapeWiFiValue(wifiMatch[2]),
        networkPassword: unescapeWiFiValue(wifiMatch[3]),
        isHiddenNetwork: wifiMatch[4] === "true",
      };
    }
    
    return {
      networkEncryption: "WPA",
      networkName: "",
      networkPassword: "",
      isHiddenNetwork: false,
    };
  },
  
  // For file types, we'll extract any URL or return empty values
  [EQRType.PDF]: (data: string): Record<string, any> => {
    // If data is a URL, it's likely the file URL
    try {
      new URL(data);
      return { fileUrl: data };
    } catch {
      return {};
    }
  },
  
  [EQRType.IMAGE]: (data: string): Record<string, any> => {
    try {
      new URL(data);
      return { fileUrl: data };
    } catch {
      return {};
    }
  },
  
  [EQRType.VIDEO]: (data: string): Record<string, any> => {
    try {
      new URL(data);
      return { fileUrl: data };
    } catch {
      return {};
    }
  },
};

// Helper function to encode form data for a specific QR type
export const encodeQRData = (
  qrType: EQRType,
  formData: Record<string, any>,
  fileId?: string
): string => {
  const encoder = qrTypeDataEncoders[qrType];
  if (!encoder) {
    throw new Error(`No encoder found for QR type: ${qrType}`);
  }
  
  return encoder(formData, fileId);
};

// Helper function to parse QR data for a specific QR type
export const parseQRData = (
  qrType: EQRType,
  data: string
): Record<string, any> => {
  const parser = qrTypeDataParsers[qrType];
  if (!parser) {
    throw new Error(`No parser found for QR type: ${qrType}`);
  }
  
  return parser(data);
};
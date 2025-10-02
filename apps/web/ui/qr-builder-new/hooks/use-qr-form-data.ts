import { useCallback, useMemo } from "react";
import {
  EQRType,
  FILE_QR_TYPES,
  LINKED_QR_TYPES,
} from "../constants/get-qr-config";
import { encodeQRData, parseQRData } from "../helpers/qr-data-handlers";

interface InitialData {
  qrType: EQRType;
  data: string;
  link?: {
    url: string;
    title?: string;
  };
  fileId?: string;
}

interface UseQRFormDataOptions {
  qrType: EQRType;
  initialData?: InitialData;
}

export const useQRFormData = ({
  qrType,
  initialData,
}: UseQRFormDataOptions) => {
  const parsedInitialData = useMemo(() => {
    if (!initialData) return {};

    // TODO QR_BUILDER_NEW: finish handling initialData when we start implementing existing QR editing.
    // We'll most likely pass initialData.link.url instead of initialData.data to parseQRData

    // try {
    //   const parsed = parseQRData(qrType, initialData.data);
    //
    //   // For link-based QR types, include URL data
    //   if (initialData.link?.url) {
    //     switch (qrType) {
    //       case EQRType.WEBSITE:
    //         parsed.websiteLink = initialData.link.url;
    //         break;
    //       case EQRType.APP_LINK:
    //         parsed.storeLink = initialData.link.url;
    //         break;
    //       case EQRType.SOCIAL:
    //         parsed.socialLink = initialData.link.url;
    //         break;
    //       case EQRType.FEEDBACK:
    //         parsed.link = initialData.link.url;
    //         break;
    //     }
    //   }
    //
    //   // Include QR name from link title if available
    //   if (initialData.link?.title) {
    //     parsed.qrName = initialData.link.title;
    //   }
    //
    //   return parsed;
    // } catch (error) {
    //   console.error('Error parsing initial data:', error);
    //   return {};
    // }

    return {};
  }, [qrType, initialData]);

  const encodeFormData = useCallback(
    (formData: Record<string, any>, fileId?: string): string => {
      try {
        return encodeQRData(qrType, formData, fileId);
      } catch (error) {
        console.error("Error encoding form data:", error);
        return "";
      }
    },
    [qrType],
  );

  // Parse QR data string to form data
  const parseFormData = useCallback(
    (data: string): Record<string, any> => {
      try {
        return parseQRData(qrType, data);
      } catch (error) {
        console.error("Error parsing QR data:", error);
        return {};
      }
    },
    [qrType],
  );

  const isFileType = useMemo(() => {
    return FILE_QR_TYPES.includes(qrType);
  }, [qrType]);

  const isLinkType = useMemo(() => {
    return LINKED_QR_TYPES.includes(qrType);
  }, [qrType]);

  // Get default form values for the QR type
  const getDefaultValues = useCallback(
    (overrides: Record<string, any> = {}) => {
      const defaults: Record<string, any> = {
        qrName: "",
        ...parsedInitialData,
        ...overrides,
      };

      switch (qrType) {
        case EQRType.WIFI:
          defaults.networkEncryption = defaults.networkEncryption || "WPA";
          defaults.networkName = defaults.networkName || "";
          defaults.networkPassword = defaults.networkPassword || "";
          defaults.isHiddenNetwork = defaults.isHiddenNetwork || false;
          break;
        case EQRType.WHATSAPP:
          defaults.number = defaults.number || "";
          defaults.message = defaults.message || "";
          break;
        case EQRType.WEBSITE:
          defaults.websiteLink = defaults.websiteLink || "";
          break;
        case EQRType.APP_LINK:
          defaults.storeLink = defaults.storeLink || "";
          break;
        case EQRType.SOCIAL:
          defaults.socialLink = defaults.socialLink || "";
          break;
        case EQRType.FEEDBACK:
          defaults.link = defaults.link || "";
          break;
        case EQRType.PDF:
          defaults.filesPDF = defaults.filesPDF || [];
          break;
        case EQRType.IMAGE:
          defaults.filesImage = defaults.filesImage || [];
          break;
        case EQRType.VIDEO:
          defaults.filesVideo = defaults.filesVideo || [];
          break;
      }

      return defaults;
    },
    [qrType, parsedInitialData],
  );

  // TODO QR_BUILDER_NEW: createLinkData method - will be needed later for link creation
  // const createLinkData = useCallback((formData: Record<string, any>, fileId?: string) => {
  //   const linkData: Record<string, any> = {};

  //   if (formData.qrName) {
  //     linkData.title = formData.qrName;
  //   }

  //   if (isFileType && fileId) {
  //     linkData.url = `https://assets.getqr.com/qrs-content/${fileId}`;
  //   } else if (isLinkType) {
  //     switch (qrType) {
  //       case EQRType.WEBSITE:
  //         linkData.url = formData.websiteLink || '';
  //         break;
  //       case EQRType.APP_LINK:
  //         linkData.url = formData.storeLink || '';
  //         break;
  //       case EQRType.SOCIAL:
  //         linkData.url = formData.socialLink || '';
  //         break;
  //       case EQRType.FEEDBACK:
  //         linkData.url = formData.link || '';
  //         break;
  //     }
  //   } else {
  //     const encodedData = encodeFormData(formData, fileId);
  //     linkData.url = encodedData || 'https://dub.co';
  //   }

  //   return linkData;
  // }, [qrType, isFileType, isLinkType, encodeFormData]);

  return {
    parsedInitialData,
    encodeFormData,
    parseFormData,
    getDefaultValues,
    // createLinkData, // TODO QR_BUILDER_NEW: uncomment when needed
    isFileType,
    isLinkType,
  };
};

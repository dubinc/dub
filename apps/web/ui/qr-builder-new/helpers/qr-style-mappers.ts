import { DOT_STYLES, CORNER_SQUARE_STYLES, CORNER_DOT_STYLES } from "@/ui/qr-builder-new/constants/customization/styles";
import { SUGGESTED_LOGOS } from "@/ui/qr-builder-new/constants/customization/logos";
import { DotType, CornerSquareType, CornerDotType } from "qr-code-styling";

/**
 * Maps QR customization style IDs to QRCodeStyling type values
 */

export const getDotsType = (dotsStyleId: string): DotType => {
  const style = DOT_STYLES.find(s => s.id === dotsStyleId);
  return (style?.type as DotType) || "dots";
};

export const getCornerSquareType = (cornerSquareStyleId: string): CornerSquareType => {
  const style = CORNER_SQUARE_STYLES.find(s => s.id === cornerSquareStyleId);
  return (style?.type as CornerSquareType) || "square";
};

export const getCornerDotType = (cornerDotStyleId: string): CornerDotType => {
  const style = CORNER_DOT_STYLES.find(s => s.id === cornerDotStyleId);
  return (style?.type as CornerDotType) || "square";
};

/**
 * Gets the suggested logo icon source by ID
 */
export const getSuggestedLogoSrc = (logoId: string) => {
  const logo = SUGGESTED_LOGOS.find(l => l.id === logoId);
  return logo?.icon?.src;
};

/**
 * Converts SVG URL to base64 for QR code styling
 */
export const convertSvgUrlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const svgText = await response.text();
    return `data:image/svg+xml;base64,${btoa(svgText)}`;
  } catch (error) {
    console.error("Error converting SVG to base64:", error);
    return "";
  }
};

/**
 * Converts QR customization data to QRCodeStyling options
 */
export const mapCustomizationToQROptions = (customizationData: any, defaultData: string, BLACK_COLOR: string, WHITE_COLOR: string) => {
  return {
    data: defaultData,
    dotsOptions: {
      type: getDotsType(customizationData.style.dotsStyle),
      color: customizationData.style.foregroundColor || BLACK_COLOR,
    },
    backgroundOptions: {
      color: customizationData.style.backgroundColor || WHITE_COLOR,
    },
    cornersSquareOptions: {
      type: getCornerSquareType(customizationData.shape.cornerSquareStyle),
      color: customizationData.style.foregroundColor || BLACK_COLOR,
    },
    cornersDotOptions: {
      type: getCornerDotType(customizationData.shape.cornerDotStyle),
      color: customizationData.style.foregroundColor || BLACK_COLOR,
    },
  };
};
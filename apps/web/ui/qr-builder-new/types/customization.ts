// Note: This data structure is NOT tied to qr-code-styling format
// It will be transformed/converted separately when rendering

export interface QRCustomizationData {
  // Frame settings
  frame: {
    id: string; // frame type id (e.g., "frame-card", "frame-none")
    color?: string; // frame color (hex)
    textColor?: string; // frame text color (hex)
    text?: string; // frame text content
  };
  
  // QR Style settings
  style: {
    dotsStyle: string; // dots style id
    foregroundColor: string; // QR foreground color (hex)
    backgroundColor?: string; // QR background color (hex) - hidden when frame is selected
  };
  
  // QR Shape settings
  shape: {
    cornerSquareStyle: string; // corner square style id
    cornerDotStyle: string; // corner dot style id
  };
  
  // Logo settings
  logo: {
    type: "none" | "suggested" | "uploaded";
    id?: string; // suggested logo id
    file?: File; // uploaded logo file
    // TODO QR_BUILDER_NEW: Add logo positioning/sizing options when needed
  };
}

// Individual section data types
export interface FrameData {
  id: string;
  color?: string;
  textColor?: string;
  text?: string;
}

export interface StyleData {
  dotsStyle: string;
  foregroundColor: string;
  backgroundColor?: string;
}

export interface ShapeData {
  cornerSquareStyle: string;
  cornerDotStyle: string;
}

export interface LogoData {
  type: "none" | "suggested" | "uploaded";
  id?: string;
  file?: File;
}

// Style option interface for pickers
export interface StyleOption {
  id: string;
  type: string;
  icon: any; // React component or image
  defaultTextColor?: string;
  extension?: (qr: SVGSVGElement, options: {
    width: number;
    height: number;
    frameColor: string;
    frameTextColor: string;
    frameText: string;
  }) => Promise<void>;
}

// Default values
export const DEFAULT_QR_CUSTOMIZATION: QRCustomizationData = {
  frame: {
    id: "frame-none",
  },
  style: {
    dotsStyle: "dots-square",
    foregroundColor: "#000000",
    backgroundColor: "#ffffff",
  },
  shape: {
    cornerSquareStyle: "corner-square-square",
    cornerDotStyle: "corner-dot-square",
  },
  logo: {
    type: "none",
  },
};
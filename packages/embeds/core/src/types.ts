export type DubInitResult = {
  openWidget: () => void;
  closeWidget: () => void;
  toggleWidget: () => void;
  isWidgetOpen: () => boolean;
  destroy: () => void;
} | null;

export interface DubEmbed {
  init: (options: DubOptions) => void;
}

export type DubOptions = {
  // The link token
  token: string;

  // The trigger for the widget
  trigger?: DubWidgetTrigger;

  // The ID of the widget (for multiple widgets on the same page)
  id?: string;

  // The widget was opened
  onOpen?: () => void;

  // The widget was closed
  onClose?: () => void;

  // An error occurred in the APIs
  onError?: (error: Error) => void;

  // The token expired
  onTokenExpired?: () => void;

  // The placement of the floating button
  buttonPlacement?: DubFloatingButtonPlacement;

  // The styles for the widget container
  containerStyles?: Partial<CSSStyleDeclaration>;
  popupStyles?: Partial<CSSStyleDeclaration>;
  buttonStyles?: Partial<CSSStyleDeclaration>;
};

export type DubWidgetTrigger = "floating-button" | "manual";

export type DubFloatingButtonPlacement =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

export interface IframeMessage {
  originator?: "Dub";
  event?: "ERROR";
  data?: {
    code: string;
    message: string;
  };
}

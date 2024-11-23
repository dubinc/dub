export interface DubEmbedOptions {
  token: string;
  onTokenExpired?: () => void;
}

export interface DubEmbed {
  init: (options: Options) => void;
  isWidgetOpen: boolean;
  toggleWidget: () => void;
  openWidget: () => void;
  closeWidget: () => void;
  destroy: () => void;
}

export interface Options {
  // The link token
  token: string;

  // The type of embed (defaults to widget)
  type?: "dashboard" | "widget";

  // The trigger for the widget
  trigger?: DubWidgetTrigger;

  // The widget was opened
  onOpen?: () => void;

  // The widget was closed
  onClose?: () => void;

  // The placement of the widget
  placement?: DubWidgetPlacement;

  // The styles for the widget container
  containerStyles?: Partial<CSSStyleDeclaration>;
  popupStyles?: Partial<CSSStyleDeclaration>;
  buttonStyles?: Partial<CSSStyleDeclaration>;
}

export type DubWidgetTrigger = "floating-button" | "manual";

export type DubWidgetPlacement =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "center";

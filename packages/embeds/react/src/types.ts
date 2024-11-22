export interface DubEmbedOptions {
  token: string;
  onTokenExpired?: () => void;
}

export interface DubEmbed {
  // Open the widget
  open: (options: Options) => void;
}

export interface Options {
  // The link token
  token: string;

  // The widget was opened
  onOpen?: () => void;

  // The widget was closed
  onClose?: () => void;
}

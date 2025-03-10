export type DubInitResult = {
  destroy: () => void;
} | null;

export interface DubEmbed {
  init: (options: DubEmbedOptions) => void;
}

export type DubEmbedOptions = {
  // The link token
  token: string;

  // The root element for the embed
  root?: HTMLElement;

  // An error occurred in the APIs
  onError?: (error: Error) => void;

  // The styles for the embed container
  containerStyles?: Partial<CSSStyleDeclaration>;

  // The data type for the embed
  data?: "referrals" | "analytics";

  // The theme for the embed (light by default)
  theme?: "light" | "dark" | "system";

  // Additional theme options
  themeOptions?: {
    // The background color for the embed
    backgroundColor?: string;
  };
};

export interface IframeMessage {
  originator?: "Dub";
  event?: "ERROR";
  data?: {
    code: string;
    message: string;
  };
}

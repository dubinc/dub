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
};

export interface IframeMessage {
  originator?: "Dub";
  event?: "ERROR";
  data?: {
    code: string;
    message: string;
  };
}

export type WellKnownConfig = {
  "apple-app-site-association": {
    applinks: {
      apps: any[];
      details: any[];
    };
  };
  "assetlinks.json": any[];
  "openai-apps-challenge": any;
};

export const supportedWellKnownFiles = [
  "apple-app-site-association",
  "assetlinks.json",
  "openai-apps-challenge",
];

export type SupportedWellKnownFiles = keyof WellKnownConfig;

export type WellKnownConfig = {
  "apple-app-site-association": {
    applinks: {
      apps: any[];
      details: any[];
    };
  };
  "assetlinks.json": any[];
};

export const supportedWellKnownFiles = [
  "apple-app-site-association",
  "assetlinks.json",
];

export type SupportedWellKnownFiles = keyof WellKnownConfig;

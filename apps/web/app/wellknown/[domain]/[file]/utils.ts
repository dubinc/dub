export type WellKnownConfig = {
  "apple-app-site-association": {
    applinks: {
      apps: any[];
      details: any[];
    };
  };
  "assetlinks.json": any[];
};

export const supportedFiles = [
  "apple-app-site-association",
  "assetlinks.json",
] as const;

export type SupportedFiles = (typeof supportedFiles)[number];

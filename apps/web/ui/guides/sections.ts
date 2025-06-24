import { IntegrationType } from "./integrations";

export const sections: {
  type: IntegrationType;
  title: string;
  description: string;
}[] = [
  {
    type: "client-sdk",
    title: "Set up client-side script",
    description:
      "The step allows Dub to track clicks, automatically fetch the partner and discount data for a given link. Select the guide for instructions.",
  },
  {
    type: "server-sdk",
    title: "Set up server-side SDK",
    description:
      "Install the server-side SDK of your choice and select the guide for instructions.",
  },
  {
    type: "track-leads",
    title: "Track lead events",
    description:
      "The step allows your app to send lead events to Dub. Select the guide for instructions.",
  },
  {
    type: "track-sales",
    title: "Track sale events",
    description:
      "The step allows your app to send sale events to Dub. Select the guide for instructions.",
  },
];

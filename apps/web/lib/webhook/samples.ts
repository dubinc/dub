import { WebhookTrigger } from "../types";

const linkCreatedEventSample = {
  id: "1",
  event: "link.created",
  createdAt: "2021-09-01T00:00:00Z",
};

const linkClickedEventSample = {
  id: "1",
  event: "link.clicked",
  createdAt: "2021-09-01T00:00:00Z",
};

export const getWebhookEventSample = <T extends WebhookTrigger>(event: T) => {
  switch (event) {
    case "link.created":
      return linkCreatedEventSample;
    case "link.clicked":
      return linkClickedEventSample;
  }
};

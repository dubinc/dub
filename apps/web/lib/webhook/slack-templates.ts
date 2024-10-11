import { LinkWebhookEvent } from "dub/models/components";
import { WebhookTrigger } from "../types";

export const generateLinkTemplate = (
  data: LinkWebhookEvent["data"],
  eventType: WebhookTrigger,
) => {
  const eventMessages = {
    "link.created": "*New short link created*",
    "link.updated": "*Short link updated*",
    "link.deleted": "*Short link deleted*",
  };

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: eventMessages[eventType],
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Short link*\n<${data.shortLink}|${data.shortLink}>\n`,
          },
          {
            type: "mrkdwn",
            text: `*Destination URL*\n<${data.url}|${data.url}>\n`,
          },
        ],
      },
    ],
  };
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

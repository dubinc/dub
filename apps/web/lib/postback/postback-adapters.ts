import { qstash } from "@/lib/cron";
import { PostbackTrigger } from "@/lib/types";
import { createWebhookSignature } from "@/lib/webhook/signature";
import { Postback } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { PostbackEventTransformers } from "./postback-event-transformers";

export interface PostbackPayload {
  eventId: string;
  event: PostbackTrigger;
  createdAt: string;
  data: unknown;
}

export abstract class PostbackAdapter {
  protected eventTransformers = new PostbackEventTransformers();

  constructor(protected postback: Postback) {
    this.registerEventTransformers();
  }

  protected abstract registerEventTransformers(): void;

  async execute(payload: PostbackPayload) {
    const transformedPayload = this.eventTransformers.transform(payload);

    if (!transformedPayload) {
      return;
    }

    const searchParams = {
      postbackId: this.postback.id,
      eventId: payload.eventId,
      event: payload.event,
    };

    const callbackUrl = buildCallbackUrl(
      `${APP_DOMAIN_WITH_NGROK}/api/postbacks/callback`,
      searchParams,
    );

    const signature = await createWebhookSignature(
      this.postback.secret,
      transformedPayload,
    );

    const response = await qstash.publishJSON({
      callback: callbackUrl.href,
      failureCallback: callbackUrl.href,
      url: this.postback.url,
      body: transformedPayload,
      headers: {
        "Dub-Signature": signature,
        "Upstash-Hide-Headers": "true",
      },
    });

    if (!response.messageId) {
      console.error("Failed to publish postback event to QStash", response);
    }

    if (process.env.NODE_ENV === "development") {
      console.debug("Published postback event to QStash", {
        ...response,
        payload: transformedPayload,
      });
    }
  }
}

function buildCallbackUrl(base: string, params: Record<string, string>): URL {
  const url = new URL(base);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  return url;
}

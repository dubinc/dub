import { qstash } from "@/lib/cron";
import { createWebhookSignature } from "@/lib/webhook/signature";
import { PartnerPostback } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { PostbackTrigger } from "../constants";
import { PostbackEventTransformers } from "./postback-event-transformers";

interface PostbackPayload {
  eventId: string;
  event: PostbackTrigger;
  createdAt: string;
  data: unknown;
}

abstract class PostbackAdapter {
  protected eventTransformers = new PostbackEventTransformers();

  constructor(protected postback: PartnerPostback) {
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

    const failureCallbackUrl = buildCallbackUrl(
      `${APP_DOMAIN_WITH_NGROK}/api/postbacks/failure`,
      {
        ...searchParams,
        failed: "true",
      },
    );

    const signature = await createWebhookSignature(
      this.postback.secret,
      transformedPayload,
    );

    const response = await qstash.publishJSON({
      callback: callbackUrl.href,
      failureCallback: failureCallbackUrl.href,
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

export class PostbackCustomAdapter extends PostbackAdapter {
  constructor(postback: PartnerPostback) {
    super(postback);
  }

  protected registerEventTransformers() {
    this.eventTransformers.register("lead.created", {
      transform: (payload) => this.formatPayload(payload),
    });

    this.eventTransformers.register("sale.created", {
      transform: (payload) => this.formatPayload(payload),
    });

    this.eventTransformers.register("commission.created", {
      transform: (payload) => this.formatPayload(payload),
    });
  }

  private formatPayload(payload: PostbackPayload) {
    return {
      id: payload.eventId,
      event: payload.event,
      createdAt: payload.createdAt,
      data: payload.data,
    };
  }
}

function buildCallbackUrl(base: string, params: Record<string, string>): URL {
  const url = new URL(base);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  return url;
}

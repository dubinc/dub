import { Postback } from "@dub/prisma/client";
import { PostbackAdapter, PostbackPayload } from "./postback-adapters";

export class PostbackCustomAdapter extends PostbackAdapter {
  constructor(postback: Postback) {
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

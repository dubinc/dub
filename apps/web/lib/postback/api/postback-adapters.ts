import { PartnerPostback } from "@dub/prisma/client";
import { PostbackTrigger } from "../constants";
import { PostbackEventTransformers } from "./postback-event-transformers";

abstract class PostbackAdapter {
  protected eventTransformers = new PostbackEventTransformers();

  constructor(protected postback: Pick<PartnerPostback, "url" | "secret">) {
    this.registerEventTransformers();
  }

  protected abstract registerEventTransformers(): void;

  async execute({
    trigger,
    payload,
  }: {
    trigger: PostbackTrigger;
    payload: unknown;
  }) {
    const transformedPayload = this.eventTransformers.transform(
      trigger,
      payload,
    );

    if (!transformedPayload) {
      return;
    }

    // TODO:
    // Send to this.postback.url
  }
}

export class PostbackCustomAdapter extends PostbackAdapter {
  constructor(postback: Pick<PartnerPostback, "url" | "secret">) {
    super(postback);
  }

  protected registerEventTransformers() {
    this.eventTransformers.register("lead.created", {
      transform: (data) => data,
    });

    this.eventTransformers.register("sale.created", {
      transform: (data) => data,
    });

    this.eventTransformers.register("commission.created", {
      transform: (data) => data,
    });
  }
}

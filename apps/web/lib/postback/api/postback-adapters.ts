import { PostbackTrigger } from "../constants";
import { PostbackEventTransformers } from "./postback-event-transformers";

abstract class PostbackAdapter {
  protected eventTransformers = new PostbackEventTransformers();

  constructor() {
    this.registerEventTransformers();
  }

  // Override this method to register event-specific transformers
  protected abstract registerEventTransformers(): void;

  private async send(payload: unknown) {
    //
  }

  async execute(event: PostbackTrigger, payload: unknown) {
    const transformedPayload = this.eventTransformers.transform(event, payload);

    if (!transformedPayload) {
      return;
    }

    await this.send(transformedPayload);
  }
}

export class PostbackCustomAdapter extends PostbackAdapter {
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

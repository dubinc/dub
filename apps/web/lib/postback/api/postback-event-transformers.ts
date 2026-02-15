import { PostbackTrigger } from "../constants";

interface PostbackPayload {
  eventId: string;
  trigger: PostbackTrigger;
  createdAt: string;
  data: unknown;
}

interface PostbackEventTransformer {
  transform(payload: PostbackPayload): unknown;
}

export class PostbackEventTransformers {
  private transformers = new Map<PostbackTrigger, PostbackEventTransformer>();

  register(event: PostbackTrigger, transformer: PostbackEventTransformer) {
    if (this.transformers.has(event)) {
      console.warn(
        `[PostbackEventTransformers] Overwriting transformer for event ${event}.`,
      );
    }

    this.transformers.set(event, transformer);

    console.log(
      `[PostbackEventTransformers] Registered transformer for event ${event}.`,
    );

    return this;
  }

  transform(payload: PostbackPayload) {
    const transformer = this.transformers.get(payload.trigger);

    if (!transformer) {
      console.warn(
        `[PostbackEventTransformers] No transformer found for event ${payload.trigger}.`,
      );

      return null;
    }

    return transformer.transform(payload);
  }
}

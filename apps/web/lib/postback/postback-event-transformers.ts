import { PostbackTrigger } from "@/lib/types";

interface PostbackPayload {
  eventId: string;
  event: PostbackTrigger;
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

    return this;
  }

  transform(payload: PostbackPayload) {
    const transformer = this.transformers.get(payload.event);

    if (!transformer) {
      console.warn(
        `[PostbackEventTransformers] No transformer found for event ${payload.event}.`,
      );

      return null;
    }

    return transformer.transform(payload);
  }
}

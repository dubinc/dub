import { PostbackTrigger } from "../constants";

interface PostbackEventTransformer {
  transform(data: unknown): unknown;
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

  transform(event: PostbackTrigger, data: unknown) {
    const transformer = this.transformers.get(event);

    if (!transformer) {
      console.warn(
        `[PostbackEventTransformers] No transformer found for event ${event}.`,
      );

      return null;
    }

    return transformer.transform(data);
  }
}

import { PostbackTrigger } from "../constants";

interface PostbackEventEnricher {
  enrich(data: unknown): unknown;
}

class PostbackEventEnrichersRegistry {
  private enrichers = new Map<PostbackTrigger, PostbackEventEnricher>();

  register(event: PostbackTrigger, enricher: PostbackEventEnricher) {
    if (this.enrichers.has(event)) {
      console.warn(
        `[PostbackEventEnrichersRegistry] Overwriting enricher for event ${event}.`,
      );
    }

    this.enrichers.set(event, enricher);

    console.log(
      `[PostbackEventEnrichersRegistry] Registered enricher for event ${event}.`,
    );

    return this;
  }

  enrich(event: PostbackTrigger, data: unknown) {
    const enricher = this.enrichers.get(event);

    if (!enricher) {
      throw new Error(
        `[PostbackEventEnrichersRegistry] No enricher registered for event ${event}.`,
      );
    }

    return enricher.enrich(data);
  }

  has(event: PostbackTrigger) {
    return this.enrichers.has(event);
  }
}

// Register event enrichers for each event type
export const postbackEventEnrichersRegistry =
  new PostbackEventEnrichersRegistry();

postbackEventEnrichersRegistry.register("lead.created", {
  enrich: (data) => {
    return data;
  },
});

postbackEventEnrichersRegistry.register("sale.created", {
  enrich: (data) => {
    return data;
  },
});

postbackEventEnrichersRegistry.register("commission.created", {
  enrich: (data) => {
    return data;
  },
});

import { ExpandedLink, transformLink } from "@/lib/api/links";
import { toCamelCase } from "@dub/utils";
import { PostbackTrigger } from "../constants";
import { leadEventPostbackSchema } from "../schemas";

interface PostbackEventEnricher {
  enrich(data: Record<string, unknown>): unknown;
}

class PostbackEventEnrichers {
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

  enrich(event: PostbackTrigger, data: Record<string, unknown>) {
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
export const postbackEventEnrichers = new PostbackEventEnrichers();

postbackEventEnrichers.register("lead.created", {
  enrich: (data) => {
    const lead = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
    );

    return leadEventPostbackSchema.parse({
      ...lead,
      click: {
        ...lead,
        id: lead.clickId,
        timestamp: new Date(lead.timestamp + "Z"),
      },
      link: transformLink(lead.link as ExpandedLink),
      customer: data.customer,
    });
  },
});

postbackEventEnrichers.register("sale.created", {
  enrich: (data) => {
    return data;
  },
});

postbackEventEnrichers.register("commission.created", {
  enrich: (data) => {
    return data;
  },
});

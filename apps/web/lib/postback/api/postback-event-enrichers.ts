import { transformLink } from "@/lib/api/links";
import { PostbackTrigger } from "@/lib/types";
import { toCamelCase } from "@dub/utils";
import {
  commissionEventPostbackSchema,
  leadEventPostbackSchema,
  saleEventPostbackSchema,
} from "../schemas";

interface PostbackEventEnricher {
  enrich(data: Record<string, unknown>): Record<string, unknown>;
}

class PostbackEventEnrichers {
  private enrichers = new Map<PostbackTrigger, PostbackEventEnricher>();

  register(event: PostbackTrigger, enricher: PostbackEventEnricher) {
    if (this.enrichers.has(event)) {
      console.warn(
        `[PostbackEventEnrichers] Overwriting enricher for event ${event}.`,
      );
    }

    this.enrichers.set(event, enricher);

    return this;
  }

  enrich(event: PostbackTrigger, data: Record<string, unknown>) {
    const enricher = this.enrichers.get(event);

    if (!enricher) {
      throw new Error(
        `[PostbackEventEnrichers] No enricher registered for event ${event}.`,
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
    const lead: any = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
    );

    return leadEventPostbackSchema.parse({
      ...lead,
      link: transformLink(lead.link),
      click: {
        ...lead,
        id: lead.clickId,
        timestamp: new Date(lead.timestamp + "Z"),
      },
      customer: lead.customer,
    });
  },
});

postbackEventEnrichers.register("sale.created", {
  enrich: (data) => {
    const sale: any = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
    );

    return saleEventPostbackSchema.parse({
      ...sale,
      link: transformLink(sale.link),
      click: {
        ...sale,
        id: sale.clickId,
        timestamp: new Date(sale.clickedAt + "Z"),
      },
      customer: sale.customer,
      sale: {
        amount: sale.amount,
        currency: sale.currency,
      },
    });
  },
});

postbackEventEnrichers.register("commission.created", {
  enrich: (data) => commissionEventPostbackSchema.parse(data),
});

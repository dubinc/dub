import { transformLink } from "@/lib/api/links";
import { generateRandomName } from "@/lib/names";
import { PostbackTrigger } from "@/lib/types";
import { toCamelCase } from "@dub/utils";
import {
  commissionEventPostbackSchema,
  leadEventPostbackSchema,
  saleEventPostbackSchema,
} from "../schemas";

export interface PostbackEnricherContext {
  customerDataSharingEnabledAt?: Date | null | undefined;
}

interface PostbackEventEnricher {
  enrich(
    data: Record<string, any>,
    context?: PostbackEnricherContext,
  ): Record<string, unknown>;
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

  enrich(
    event: PostbackTrigger,
    data: Record<string, unknown>,
    context?: PostbackEnricherContext,
  ) {
    const enricher = this.enrichers.get(event);

    if (!enricher) {
      throw new Error(
        `[PostbackEventEnrichers] No enricher registered for event ${event}.`,
      );
    }

    return enricher.enrich(data, context);
  }

  has(event: PostbackTrigger) {
    return this.enrichers.has(event);
  }
}

function transformCustomer({
  customer,
  customerDataSharingEnabledAt,
}: {
  customer: Record<string, any>;
  customerDataSharingEnabledAt: PostbackEnricherContext["customerDataSharingEnabledAt"];
}) {
  if (!customer) {
    return null;
  }

  const email = customer?.email
    ? customerDataSharingEnabledAt
      ? customer.email
      : customer.email.replace(/(?<=^.).+(?=.@)/, "****")
    : customer?.name || generateRandomName();

  return {
    ...customer,
    email,
  };
}

// Register event enrichers for each event type
export const postbackEventEnrichers = new PostbackEventEnrichers();

postbackEventEnrichers.register("lead.created", {
  enrich: (data, context) => {
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
      customer: transformCustomer({
        customer: lead.customer,
        customerDataSharingEnabledAt: context?.customerDataSharingEnabledAt,
      }),
    });
  },
});

postbackEventEnrichers.register("sale.created", {
  enrich: (data, context) => {
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
      customer: transformCustomer({
        customer: sale.customer,
        customerDataSharingEnabledAt: context?.customerDataSharingEnabledAt,
      }),
      sale: {
        amount: sale.amount,
        currency: sale.currency,
      },
    });
  },
});

postbackEventEnrichers.register("commission.created", {
  enrich: (data, context) => {
    return commissionEventPostbackSchema.parse({
      ...data,
      customer: transformCustomer({
        customer: data.customer,
        customerDataSharingEnabledAt: context?.customerDataSharingEnabledAt,
      }),
    });
  },
});

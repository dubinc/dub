import { PostbackTrigger } from "@/lib/types";
import { Postback } from "@dub/prisma/client";
import type { z } from "zod/v4";
import {
  commissionEventPostbackSchema,
  leadEventPostbackSchema,
  saleEventPostbackSchema,
} from "../schemas";
import { PostbackAdapter } from "./postback-adapters";

type LeadEventPostback = z.infer<typeof leadEventPostbackSchema>;
type SaleEventPostback = z.infer<typeof saleEventPostbackSchema>;
type CommissionEventPostback = z.infer<typeof commissionEventPostbackSchema>;

interface PostbackPayload<T extends Record<string, unknown>> {
  eventId: string;
  event: PostbackTrigger;
  createdAt: string;
  data: T;
}

export class PostbackSlackAdapter extends PostbackAdapter {
  constructor(postback: Postback) {
    super(postback);
  }

  protected registerEventTransformers() {
    this.eventTransformers.register("lead.created", {
      transform: ({ data }: PostbackPayload<LeadEventPostback>) => {
        throw Error("Not implemented.");
      },
    });

    this.eventTransformers.register("sale.created", {
      transform: ({ data }: PostbackPayload<SaleEventPostback>) => {
        throw Error("Not implemented.");
      },
    });

    this.eventTransformers.register("commission.created", {
      transform: ({ data }: PostbackPayload<CommissionEventPostback>) => {
        throw Error("Not implemented.");
      },
    });
  }
}

function escapeSlackText(value: string | null | undefined) {
  if (value == null) {
    return "";
  }

  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

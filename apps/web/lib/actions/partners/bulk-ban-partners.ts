"use server";

import { bulkRejectPartnersSchema } from "@/lib/zod/schemas/partners";
import { authActionClient } from "../safe-action";

export const bulkBanPartnersAction = authActionClient
  .schema(bulkRejectPartnersSchema)
  .action(async ({ parsedInput, ctx }) => {
    // TODO:
    // Not implemented yet
  });

"use server";

import { deleteEmailChangeRequest } from "@/lib/auth/confirm-email-change";
import { flattenValidationErrors } from "next-safe-action";
import * as z from "zod/v4";
import { actionClient } from "./safe-action";

const cancelEmailChangeSchema = z.object({
  token: z.string().min(1),
});

export const cancelEmailChangeAction = actionClient
  .inputSchema(cancelEmailChangeSchema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput }) => {
    const { token } = parsedInput;

    await deleteEmailChangeRequest(token);
  });

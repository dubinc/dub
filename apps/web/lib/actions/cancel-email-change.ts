"use server";

import { flattenValidationErrors } from "next-safe-action";
import * as z from "zod/v4";
import { deleteVerificationTokens } from "../better-auth/verification-token";
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

    await deleteVerificationTokens({
      kind: "emailChange",
      identifier: token,
    });
  });

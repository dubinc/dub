"use server";

import { prisma } from "@dub/prisma";
import { z } from "zod";
import { addAppAchAccount } from "../dots/add-app-ach-account";
import { createDotsApp } from "../dots/create-dots-app";
import { addBankAccountSchema } from "../dots/schemas";
import { authActionClient } from "./safe-action";

const schema = addBankAccountSchema.extend({ workspaceId: z.string() });

export const addBankAccountAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { accountNumber, accountType, routingNumber } = parsedInput;

    let dotsAppId: string | null = workspace.dotsAppId;

    // Create Dots app if it doesn't exist
    if (!dotsAppId) {
      const dotsApp = await createDotsApp({ workspace });

      await prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          dotsAppId: dotsApp.id,
        },
      });

      dotsAppId = dotsApp.id;
    }

    // Add bank account to Dots app
    const achAccount = await addAppAchAccount({
      dotsAppId,
      accountNumber,
      routingNumber,
      accountType,
    });

    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        bankAccountName: achAccount.name,
        partialAccountNumber: achAccount.mask,
        routingNumber,
        bankAccountVerified: false, // re-verify the bank account
      },
    });

    return achAccount;
  });

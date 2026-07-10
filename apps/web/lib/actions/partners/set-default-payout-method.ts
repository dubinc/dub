"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { getPartnerPayoutMethods } from "@/lib/payouts/get-partner-payout-methods";
import { recomputePartnerPayoutState } from "@/lib/payouts/recompute-partner-payout-state";
import { prisma } from "@/lib/prisma";
import {
  partnerProfileChangeHistoryLogSchema,
  setDefaultPayoutMethodSchema,
} from "@/lib/zod/schemas/partner-profile";
import { getPayoutMethodLabel } from "@/ui/partners/payouts/payout-method-config";
import { sendEmail } from "@dub/email";
import DefaultPayoutMethodChanged from "@dub/email/templates/default-payout-method-changed";
import { waitUntil } from "@vercel/functions";
import { authPartnerActionClient } from "../safe-action";

export const setDefaultPayoutMethodAction = authPartnerActionClient
  .inputSchema(setDefaultPayoutMethodSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner, partnerUser } = ctx;
    const { type } = parsedInput;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "payout_settings.update",
    });

    if (!partner.payoutsEnabledAt) {
      throw new Error(
        `You haven't enabled payout yet. Please connect a payout method first.`,
      );
    }

    const payoutMethods = await getPartnerPayoutMethods(partner);
    const payoutMethod = payoutMethods.find((m) => m.type === type);

    if (!payoutMethod) {
      throw new Error("This payout method is not available for your country.");
    }

    if (payoutMethod.default) {
      throw new Error("This is already your default payout method.");
    }

    const { activePayoutMethods } = await recomputePartnerPayoutState(partner);
    if (!activePayoutMethods.includes(type)) {
      throw new Error(
        "This payout method can't receive payouts right now. Please fix it in Stripe or choose another method.",
      );
    }

    const fromDefault = partner.defaultPayoutMethod;

    const partnerChangeHistoryLog = partner.changeHistoryLog
      ? partnerProfileChangeHistoryLogSchema.parse(partner.changeHistoryLog)
      : [];

    partnerChangeHistoryLog.push({
      field: "defaultPayoutMethod",
      from: fromDefault,
      to: type,
      changedAt: new Date(),
    });

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        defaultPayoutMethod: type,
        changeHistoryLog: partnerChangeHistoryLog,
      },
    });

    if (partner.email) {
      const fromLabel = fromDefault
        ? getPayoutMethodLabel(fromDefault)
        : "Not set";
      const toLabel = getPayoutMethodLabel(type);

      waitUntil(
        sendEmail({
          variant: "notifications",
          subject: "Your default payout method was updated",
          to: partner.email,
          react: DefaultPayoutMethodChanged({
            email: partner.email,
            fromLabel,
            toLabel,
          }),
        }),
      );
    }
  });

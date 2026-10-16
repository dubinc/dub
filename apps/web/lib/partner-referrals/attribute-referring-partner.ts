"use server";

import { attributeReferringPartner } from "@/lib/api/partners/attribute-referring-partner";
import { authActionClient } from "../actions/safe-action";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";
import { attributeReferringPartnerSchema } from "./schemas";

export const attributeReferringPartnerAction = authActionClient
  .inputSchema(attributeReferringPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerId, referredByPartnerId, createCommissionsForPastEvents } =
      parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    await attributeReferringPartner({
      workspace,
      partnerId,
      referredByPartnerId,
      createCommissionsForPastEvents,
    });
  });

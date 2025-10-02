"use server";

import { checkFeaturesAccessAuthLess } from "./check-features-access-auth-less";
import { authUserActionClient } from "./safe-action";

export const checkFeaturesAccess = authUserActionClient.action(
  async ({ ctx }) => {
    const userId = ctx.user.id;

    return await checkFeaturesAccessAuthLess(userId);
  },
);

'use server';

import { authUserActionClient } from "./safe-action";
import { checkFeaturesAccessAuthLess } from './check-features-access-auth-less';

export const checkFeaturesAccess = authUserActionClient
  .action(async ({ ctx }) => {
    const userId = ctx.user.id;

    return await checkFeaturesAccessAuthLess(userId);
  });

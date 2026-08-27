import { test as base } from "../fixtures";
import {
  createCampaignSession,
  type CampaignSession,
} from "./send-campaign-workflow-helpers";

export const test = base.extend<{ campaign: CampaignSession }>({
  campaign: async ({ api, program }, use) => {
    const session = createCampaignSession(api, program);
    await use(session);
    await session.cleanup();
  },
});

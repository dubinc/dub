import type { NextApiRequest, NextApiResponse } from "next";
import { verifySignature } from "@upstash/qstash/nextjs";
import { updateUsage } from "@/lib/cron/usage";

/**
 * Cron to update the usage stats of each project.
 * Runs once every day at 7AM PST.
 **/

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const results = await updateUsage();
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * verifySignature will try to load `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` from the environment.

 * To test out the endpoint manually (wihtout using QStash), you can do `export default handler` instead and
 * hit this endpoint via http://localhost:3000/api/cron/domains
 */
const Cron = () => {
  if (process.env.NODE_ENV === "development") {
    return handler;
  } else {
    return verifySignature(handler);
  }
};

export default Cron();

export const config = {
  api: {
    bodyParser: false,
  },
};

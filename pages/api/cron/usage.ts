import type { NextApiRequest, NextApiResponse } from "next";
import { verifySignature } from "@upstash/qstash/nextjs";
import { updateUsage } from "#/lib/cron/usage";
import { log } from "#/lib/utils";

/**
 * Cron to update the usage stats of each project.
 * Runs once every day at 7AM PST.
 **/

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const results = await updateUsage();
    res.status(200).json(results);
  } catch (error) {
    await log({
      message: "Usage cron failed. Error: " + error.message,
      type: "cron",
      mention: true,
    });
    res.status(500).json({ error: error.message });
  }
}

/**
 * verifySignature will try to load `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` from the environment.

 * This will only run in production. In development, it will return the handler without verifying the signature.
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

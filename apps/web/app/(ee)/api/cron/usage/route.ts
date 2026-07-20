import { withCron } from "@/lib/cron/with-cron";
import { logAndRespond } from "../utils";
import { updateUsage } from "./utils";

export const dynamic = "force-dynamic";

/*
    This route is used to update the usage stats of each workspace.
    Runs once every day at noon UTC (0 12 * * *)
*/
export const POST = withCron(async () => {
  const result = await updateUsage();
  return logAndRespond(result);
});

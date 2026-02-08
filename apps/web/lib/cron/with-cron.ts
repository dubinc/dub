import { APP_DOMAIN_WITH_NGROK, getSearchParams, log } from "@dub/utils";
import { logAndRespond } from "app/(ee)/api/cron/utils";
import { logger, withAxiomBodyLog } from "../axiom/server";
import { verifyQstashSignature } from "./verify-qstash";
import { verifyVercelSignature } from "./verify-vercel";

interface WithCronHandler {
  ({
    req,
    params,
    searchParams,
    rawBody,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    rawBody: string;
  }): Promise<Response>;
}

export const withCron = (handler: WithCronHandler) => {
  return withAxiomBodyLog(
    async (
      req,
      { params: initialParams }: { params: Promise<Record<string, string>> },
    ) => {
      // Clone the request early so handlers can read the body without cloning
      // Keep the original for withAxiomBodyLog to read in onSuccess
      const clonedReq = req.clone();

      const params = (await initialParams) || {};
      const searchParams = getSearchParams(req.url);
      const url = new URL(req.url || "", APP_DOMAIN_WITH_NGROK);

      try {
        let rawBody: string | undefined;

        // Verify signature based on HTTP method
        if (req.method === "GET") {
          // GET requests are typically from Vercel Cron
          await verifyVercelSignature(req);
        } else if (req.method === "POST") {
          // POST requests are typically from QStash
          rawBody = await clonedReq.text();
          await verifyQstashSignature({ req, rawBody });
        } else {
          throw new Error(`Unsupported HTTP method: ${req.method}`);
        }

        return await handler({
          req: clonedReq,
          searchParams,
          params,
          rawBody: rawBody ?? "",
        });
      } catch (error) {
        console.error(error);

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Send error to Axiom
        logger.error(errorMessage, error);
        await logger.flush();

        await log({
          message: `Cron job "${url.pathname}" failed during execution. Error: ${errorMessage}`,
          type: "cron",
        });

        return logAndRespond(errorMessage, { status: 500 });
      }
    },
  );
};

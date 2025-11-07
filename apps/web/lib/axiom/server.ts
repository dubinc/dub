import { AxiomJSTransport, Logger } from "@axiomhq/logging";
import {
  createAxiomRouteHandler,
  nextJsFormatters,
  transformRouteHandlerSuccessResult,
} from "@axiomhq/nextjs";
import { getSearchParams } from "@dub/utils";
import { axiomClient } from ".";

export const logger = new Logger({
  transports: [
    new AxiomJSTransport({
      axiom: axiomClient,
      dataset: process.env.NEXT_PUBLIC_AXIOM_DATASET!,
    }),
  ],
  formatters: nextJsFormatters,
});

export const withAxiomBodyLog = createAxiomRouteHandler(logger, {
  onSuccess: async (data) => {
    const [message, report] = transformRouteHandlerSuccessResult(data);

    // Add body to report if the method is POST, PATCH, or PUT
    if (["POST", "PATCH", "PUT"].includes(data.req.method)) {
      report.body = await data.req.json();
    }

    // Add search params to report
    report.searchParams = getSearchParams(data.req.url);

    logger.info(message, report);
    logger.flush();
  },
});

export const withAxiom = createAxiomRouteHandler(logger);

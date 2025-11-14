import {
  AxiomJSTransport,
  ConsoleTransport,
  Logger,
  LogLevel,
} from "@axiomhq/logging";
import {
  createAxiomRouteHandler,
  nextJsFormatters,
  transformRouteHandlerSuccessResult,
} from "@axiomhq/nextjs";
import { getSearchParams } from "@dub/utils";
import { axiomClient } from "./axiom";

const isAxiomEnabled = process.env.AXIOM_DATASET && process.env.AXIOM_TOKEN;

const getLogLevelFromStatusCode = (statusCode: number) => {
  if (statusCode >= 100 && statusCode < 400) {
    return LogLevel.info;
  } else if (statusCode >= 400 && statusCode < 500) {
    return LogLevel.warn;
  } else if (statusCode >= 500) {
    return LogLevel.error;
  }

  return LogLevel.info;
};

export const logger = new Logger({
  transports: isAxiomEnabled
    ? [
        new AxiomJSTransport({
          axiom: axiomClient,
          dataset: process.env.AXIOM_DATASET!,
        }),
      ]
    : [new ConsoleTransport()],
  formatters: nextJsFormatters,
});

export const withAxiomBodyLog = createAxiomRouteHandler(logger, {
  onSuccess: async (data) => {
    const [message, report] = transformRouteHandlerSuccessResult(data);

    // Add body to report if the method is POST, PATCH, or PUT
    if (["POST", "PATCH", "PUT"].includes(data.req.method)) {
      try {
        report.body = await data.req.json();
      } catch (error) {
        // Body might be empty, invalid JSON
        // Silently skip adding body to report
      }
    }

    // Add search params to report
    report.searchParams = getSearchParams(data.req.url);

    logger.log(getLogLevelFromStatusCode(data.res.status), message, report);
    await logger.flush();
  },
});

export const withAxiom = createAxiomRouteHandler(logger);

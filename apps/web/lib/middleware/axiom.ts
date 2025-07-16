import { Logger, LogLevel } from "next-axiom";
import { NextFetchEvent, NextRequest } from "next/server";

export default function AxiomMiddleware(req: NextRequest, ev: NextFetchEvent) {
  const logger = new Logger({
    source: "middleware",
    logLevel: LogLevel.error,
  });
  logger.middleware(req);
  ev.waitUntil(logger.flush());
}

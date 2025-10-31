import { waitUntil } from "@vercel/functions";
import { importErrorLogSchema } from "../zod/schemas/import-error-log";
import { tb, tbOld } from "./client";

export const logImportErrorTB = tb.buildIngestEndpoint({
  datasource: "dub_import_error_logs",
  event: importErrorLogSchema,
});

// TODO: Remove after Tinybird migration
export const logImportErrorTBOld = tbOld.buildIngestEndpoint({
  datasource: "dub_import_error_logs",
  event: importErrorLogSchema,
});

export const logImportError = async (payload: any) => {
  waitUntil(logImportErrorTBOld(payload));
  return await logImportErrorTB(payload);
};

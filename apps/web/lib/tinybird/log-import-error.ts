import { waitUntil } from "@vercel/functions";
import { importErrorLogSchema } from "../zod/schemas/import-error-log";
import { tb, tbNew } from "./client";

export const logImportErrorTB = tb.buildIngestEndpoint({
  datasource: "dub_import_error_logs",
  event: importErrorLogSchema,
});

// TODO: Remove after Tinybird migration
export const logImportErrorTBNew = tbNew.buildIngestEndpoint({
  datasource: "dub_import_error_logs",
  event: importErrorLogSchema,
});

export const logImportError = async (payload: any) => {
  waitUntil(logImportErrorTBNew(payload));
  return await logImportErrorTB(payload);
};

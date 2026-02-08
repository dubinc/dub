import { importErrorLogSchema } from "../zod/schemas/import-error-log";
import { tb } from "./client";

export const logImportError = tb.buildIngestEndpoint({
  datasource: "dub_import_error_logs",
  event: importErrorLogSchema,
});

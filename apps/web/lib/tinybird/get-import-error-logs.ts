import * as z from "zod/v4";
import { importErrorLogSchema } from "../zod/schemas/import-error-log";
import { tb } from "./client";

export const getImportErrorLogs = tb.buildPipe({
  pipe: "get_import_error_logs",
  parameters: z.object({
    workspaceId: z.string(),
    importId: z.string(),
  }),
  data: importErrorLogSchema,
});

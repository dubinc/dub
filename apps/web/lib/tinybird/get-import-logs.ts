import z from "../zod";
import { importLogSchema } from "../zod/schemas/import-logs";
import { tb } from "./client";

export const getImportLogs = tb.buildPipe({
  pipe: "get_import_logs",
  parameters: z.object({
    workspaceId: z.string(),
    importId: z.string(),
  }),
  data: importLogSchema,
});

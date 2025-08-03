import { z } from "zod";
import { importLogSchema } from "../zod/schemas/import-logs";
import { tb } from "./client";

const recordImportLogTB = tb.buildIngestEndpoint({
  datasource: "dub_import_logs",
  event: importLogSchema,
});

export const recordImportLog = async (
  logs: z.infer<typeof importLogSchema>[],
) => {
  if (logs.length === 0) {
    return;
  }

  console.log("importLogs", logs.length);

  await recordImportLogTB(logs);
};

import { withCron } from "@/lib/cron/with-cron";
import { importCommissions } from "@/lib/tapfiliate/import-commissions";
import { importCustomers } from "@/lib/tapfiliate/import-customers";
import { importGroups } from "@/lib/tapfiliate/import-groups";
import { importPartners } from "@/lib/tapfiliate/import-partners";
import { tapfiliateImportPayloadSchema } from "@/lib/tapfiliate/schemas";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

export const POST = withCron(async ({ rawBody }) => {
  const payload = tapfiliateImportPayloadSchema.parse(JSON.parse(rawBody));

  switch (payload.action) {
    case "import-groups":
      await importGroups(payload);
      break;
    case "import-partners":
      await importPartners(payload);
      break;
    case "import-customers":
      await importCustomers(payload);
      break;
    case "import-commissions":
      await importCommissions(payload);
      break;
  }

  return logAndRespond("OK");
});

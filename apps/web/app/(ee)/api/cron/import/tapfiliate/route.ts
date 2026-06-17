import { withCron } from "@/lib/cron/with-cron";
import { importCustomers } from "@/lib/tapfiliate/import-customers";
import { importPartners } from "@/lib/tapfiliate/import-partners";
import { tapfiliateImportPayloadSchema } from "@/lib/tapfiliate/schemas";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

export const POST = withCron(async ({ rawBody }) => {
  const payload = tapfiliateImportPayloadSchema.parse(JSON.parse(rawBody));

  switch (payload.action) {
    case "import-partners":
      await importPartners(payload);
      break;
    case "import-customers":
      await importCustomers(payload);
      break;
    // case "import-commissions":
    //   await importCommissions(payload);
    //   break;
  }

  return logAndRespond("OK");
});

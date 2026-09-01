import { withCron } from "@/lib/cron/with-cron";
import { importCommissions } from "@/lib/lemonsqueezy/import-commissions";
import { importCustomers } from "@/lib/lemonsqueezy/import-customers";
import { importPartners } from "@/lib/lemonsqueezy/import-partners";
import { lemonSqueezyImportPayloadSchema } from "@/lib/lemonsqueezy/schemas";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

export const POST = withCron(async ({ rawBody }) => {
  const payload = lemonSqueezyImportPayloadSchema.parse(JSON.parse(rawBody));

  switch (payload.action) {
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

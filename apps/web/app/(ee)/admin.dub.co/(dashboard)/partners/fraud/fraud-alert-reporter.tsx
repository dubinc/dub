import { adminFraudAlertSchema } from "@/lib/zod/schemas/admin";
import { DUB_LOGO, OG_AVATAR_URL } from "@dub/utils";
import * as z from "zod/v4";

type AdminFraudAlert = z.infer<typeof adminFraudAlertSchema>;

export function FraudAlertReporter({
  fraudAlert,
}: {
  fraudAlert: AdminFraudAlert;
}) {
  if (fraudAlert.source === "admin") {
    fraudAlert.program.name = "Dub Admin";
    fraudAlert.program.logo = DUB_LOGO;
  }

  return (
    <div className="flex items-center gap-2">
      <img
        src={
          fraudAlert.program.logo ||
          `${OG_AVATAR_URL}${fraudAlert.program.name}`
        }
        alt={fraudAlert.program.name}
        className="size-4 rounded-full"
      />
      <span className="truncate text-sm">{fraudAlert.program.name}</span>
    </div>
  );
}

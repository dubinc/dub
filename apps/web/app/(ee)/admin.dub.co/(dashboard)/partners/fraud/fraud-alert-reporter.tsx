import { adminFraudAlertSchema } from "@/lib/zod/schemas/admin";
import { StatusBadge } from "@dub/ui";
import { OG_AVATAR_URL } from "@dub/utils";
import * as z from "zod/v4";

type AdminFraudAlert = z.infer<typeof adminFraudAlertSchema>;

export function FraudAlertReporter({
  fraudAlert,
}: {
  fraudAlert: AdminFraudAlert;
}) {
  if (fraudAlert.source === "admin") {
    return <StatusBadge variant="error">Dub Admin</StatusBadge>;
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

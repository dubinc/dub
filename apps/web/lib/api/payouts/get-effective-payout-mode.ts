import { PayoutMode, ProgramPayoutMode } from "@dub/prisma";

export function getEffectivePayoutMode({
  payoutMode,
  payoutsEnabledAt,
}: {
  payoutMode: ProgramPayoutMode | null;
  payoutsEnabledAt: Date | null;
}): PayoutMode {
  switch (payoutMode) {
    case "internal":
      return "internal";
    case "external":
      return "external";
    case "hybrid":
      return payoutsEnabledAt === null ? "external" : "internal";
    default:
      throw new Error(`Invalid payout mode: ${payoutMode}`);
  }
}

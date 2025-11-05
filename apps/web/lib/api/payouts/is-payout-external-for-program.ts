import { PayoutMode, ProgramPayoutMode } from "@prisma/client";

interface IsPayoutExternalForProgramProps {
  payoutMode: ProgramPayoutMode | null;
  payoutsEnabledAt: Date | null;
}

export function isPayoutExternal({
  payoutMode,
  payoutsEnabledAt,
}: IsPayoutExternalForProgramProps): boolean {
  switch (payoutMode) {
    case "internal":
      return false;
    case "external":
      return true;
    case "hybrid":
      return payoutsEnabledAt === null;
    default:
      throw new Error(`Invalid payout mode: ${payoutMode}`);
  }
}

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

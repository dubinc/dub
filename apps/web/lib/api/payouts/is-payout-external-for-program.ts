import { PayoutMode } from "@prisma/client";

interface IsPayoutExternalForProgramProps {
  payoutMode: PayoutMode | null;
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

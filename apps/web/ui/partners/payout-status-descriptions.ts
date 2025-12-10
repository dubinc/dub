import { MIN_WITHDRAWAL_AMOUNT_CENTS } from "@/lib/constants/payouts";
import { currencyFormatter } from "@dub/utils";

export const PAYOUT_STATUS_DESCRIPTIONS = {
  stripe: {
    pending:
      "Payouts that have passed the holding period and are awaiting payment. This may include payouts that have not yet met the program minimum.",
    processing:
      "Payouts that are being processed by the program – this can take up to 5 business days.",
    processed: `Payouts that have been processed by the program and will be paid out to your connected bank account once they reach the minimum withdrawal amount of ${currencyFormatter(MIN_WITHDRAWAL_AMOUNT_CENTS, { trailingZeroDisplay: "stripIfInteger" })}.`,
    sent: "Payouts that are on their way to your connected bank account – this can take anywhere from 1 to 14 business days depending on your bank location.",
    completed:
      "Payouts that have been paid out to your connected bank account.",
  },

  paypal: {
    pending:
      "Payouts that have passed the holding period and are awaiting payment. This may include payouts that have not yet met the program minimum.",
    processing:
      "Payouts that have been processed by the program and are on their way to your PayPal account - this can take up to 5 business days.",
    processed: "",
    sent: "",
    completed: "Payouts that have been paid out to your PayPal account",
  },
};

import { MIN_WITHDRAWAL_AMOUNT_CENTS } from "@/lib/constants/payouts";
import { currencyFormatter } from "@dub/utils";

export const PAYOUT_STATUS_DESCRIPTIONS = {
  stripe: {
    pending:
      "Payouts that have passed the [program's holding period](https://dub.co/help/article/commissions-payouts#what-does-holding-period-mean) and are awaiting payment from the program (as long as it reaches the [program's minimum payout amount](https://dub.co/help/article/commissions-payouts#what-does-minimum-payout-amount-mean)).",
    processing:
      "Payouts that are being processed by the program – this can take up to 5 business days.",
    processed: `Payouts that have been processed by the program and will be paid out to your connected bank account once they reach the [${currencyFormatter(MIN_WITHDRAWAL_AMOUNT_CENTS, { trailingZeroDisplay: "stripIfInteger" })} minimum withdrawal amount](https://dub.co/help/article/receiving-payouts#what-is-the-minimum-withdrawal-amount-and-how-does-it-work).`,
    sent: "Payouts that are on their way to your connected bank account – this can take anywhere from 1 to 14 business days depending on your bank location.",
    completed:
      "Payouts that have been paid out to your connected bank account.",
  },

  paypal: {
    pending:
      "Payouts that have passed the [program's holding period](https://dub.co/help/article/commissions-payouts#what-does-holding-period-mean) and are awaiting payment from the program (once it reaches the [program's minimum payout amount](https://dub.co/help/article/commissions-payouts#what-does-minimum-payout-amount-mean)).",
    processing:
      "Payouts that have been processed by the program and are on their way to your PayPal account - this can take up to 5 business days.",
    processed: "",
    sent: "",
    completed: "Payouts that have been paid out to your PayPal account",
  },
};

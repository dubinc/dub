import ApplePay from "@/ui/shared/icons/payments/apple-pay.tsx";
import GooglePay from "@/ui/shared/icons/payments/google-pay.tsx";
import MasterCard from "@/ui/shared/icons/payments/master-card.tsx";
import Paypal from "@/ui/shared/icons/payments/paypal.tsx";
import Visa from "@/ui/shared/icons/payments/visa.tsx";

const payments = [
  { icon: Visa, alt: "Visa" },
  { icon: MasterCard, alt: "MasterCard" },
  { icon: Paypal, alt: "PayPal" },
  { icon: ApplePay, alt: "Apple Pay" },
  { icon: GooglePay, alt: "Google Pay" },
];

export const Payments = () => (
  <ul className="flex gap-1.5">
    {payments.map(({ icon: Icon, alt }) => (
      <li
        key={alt}
        className="flex h-8 w-[52px] items-center justify-center rounded-lg border border-zinc-200 bg-white"
      >
        <Icon className="h-6 w-[80%]" aria-label={alt} />
      </li>
    ))}
  </ul>
);

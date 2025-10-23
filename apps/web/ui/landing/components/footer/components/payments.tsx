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
  <div className="flex flex-wrap items-center gap-4">
    {payments.map(({ icon: Icon, alt }) => (
      <Icon key={alt} className="h-8" aria-label={alt} />
    ))}
  </div>
);

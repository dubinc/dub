import PaymentMethods from "./payment-methods";
import PlanUsage from "./plan-usage";

export default function WorkspaceBilling() {
  return (
    <div className="grid gap-8">
      <PlanUsage />
      <PaymentMethods />
    </div>
  );
}

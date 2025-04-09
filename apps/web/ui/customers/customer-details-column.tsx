import { CustomerProps } from "@/lib/types";

export function CustomerDetailsColumn({
  customer,
}: {
  customer: CustomerProps;
}) {
  return (
    <div>
      <h1>{customer.name}</h1>
    </div>
  );
}

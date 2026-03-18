import { CustomerProps, NullableOptional } from "@/lib/types";
import { Avatar } from "@/ui/avatar";

export function CustomerAvatar({
  customer,
  className,
  showName = false,
}: {
  customer: NullableOptional<
    Pick<CustomerProps, "id" | "name" | "email" | "avatar">
  >;
  className?: string;
  showName?: boolean;
}) {
  const identifier = customer.name || customer.email || customer.id || "Unknow";
  const displayName =
    customer.name || customer.email || customer.id || "Customer";

  return (
    <Avatar
      imageUrl={customer.avatar}
      identifier={identifier}
      displayName={displayName}
      showName={showName}
      className={className}
    />
  );
}

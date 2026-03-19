import { CustomerProps, NullableOptional } from "@/lib/types";
import { Avatar } from "@dub/ui";

export function CustomerAvatar({
  customer,
  className,
}: {
  customer: NullableOptional<
    Pick<CustomerProps, "id" | "name" | "email" | "avatar">
  >;
  className?: string;
}) {
  return (
    <Avatar
      imageUrl={customer.avatar}
      identifier={customer.id || customer.name || customer.email || "Unknown"}
      className={className}
    />
  );
}

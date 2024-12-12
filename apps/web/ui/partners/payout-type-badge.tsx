import {
  CursorRays,
  InvoiceDollar,
  MoneyBill2,
  UserCheck,
} from "@dub/ui/icons";
import { capitalize } from "@dub/utils/src/functions";

export const PayoutTypeBadge = ({
  type,
}: {
  type: "clicks" | "leads" | "sales" | "custom";
}) => {
  const Icon =
    type === "clicks"
      ? CursorRays
      : type === "leads"
        ? UserCheck
        : type === "sales"
          ? InvoiceDollar
          : MoneyBill2;
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-4" />
      {capitalize(type)}
    </div>
  );
};

import { ReferralFormDataField, ReferralProps } from "@/lib/types";
import { formatFormDataValue } from "./referral-utils";

interface ReferralDetailsProps {
  referral: Pick<ReferralProps, "formData">;
}

export function ReferralDetails({ referral }: ReferralDetailsProps) {
  const formData = referral.formData as
    | ReferralFormDataField[]
    | null
    | undefined;

  return (
    <div className="@3xl/sheet:order-1">
      <div className="border-border-subtle overflow-hidden rounded-xl border bg-white p-4">
        <h3 className="text-content-emphasis mb-4 text-lg font-semibold">
          Referral details
        </h3>
        <div className="grid grid-cols-1 gap-4 text-sm text-neutral-600">
          {formData?.map((field) => (
            <div key={field.key}>
              <div className="text-content-default text-sm font-semibold">
                {field.label}
              </div>
              <div className="text-content-default text-sm">
                {formatFormDataValue(field.value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

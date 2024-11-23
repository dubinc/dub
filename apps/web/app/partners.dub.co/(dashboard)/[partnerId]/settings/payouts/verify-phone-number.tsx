import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { Combobox, Input } from "@dub/ui";
import { cn, COUNTRIES, COUNTRY_PHONE_CODES } from "@dub/utils";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

export function VerifyPhoneNumber() {
  const { partner } = usePartnerProfile();

  const { register, setValue, handleSubmit, watch } = useForm<{
    countryCode: string;
    phoneNumber: string;
  }>({
    defaultValues: {
      countryCode: partner?.country ?? "",
    },
  });

  return (
    <div>
      <p className="text-sm font-medium">
        Verify your phone number to receive payouts
      </p>
      <form
        onSubmit={handleSubmit(async (data) => {
          console.log(data);
        })}
        className="mt-2"
      >
        <div className="flex max-w-fit items-center gap-2">
          <CountryPhoneCodesCombobox
            value={watch("countryCode")}
            onChange={(value) => {
              console.log(value);
              setValue("countryCode", value);
            }}
          />
          <Input
            {...register("phoneNumber")}
            type="tel"
            className="w-60"
            placeholder="(888) 888-8888"
          />
        </div>
      </form>
    </div>
  );
}

function CountryPhoneCodesCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const options = useMemo(
    () =>
      Object.entries(COUNTRY_PHONE_CODES).map(([key, value]) => ({
        icon: (
          <img
            alt={key}
            src={`https://flag.vercel.app/m/${key}.svg`}
            className="mr-1 h-2.5 w-4"
          />
        ),
        value: key,
        label: `${COUNTRIES[key]} +${value.toString()}`,
      })),
    [],
  );

  return (
    <Combobox
      selected={options.find((o) => o.value === value) ?? null}
      setSelected={(option) => {
        if (!option) return;
        onChange(option.value);
      }}
      options={options}
      icon={
        value ? (
          <img
            alt={value}
            src={`https://flag.vercel.app/m/${value}.svg`}
            className="h-2.5 w-4"
          />
        ) : undefined
      }
      caret={true}
      placeholder="Select country"
      searchPlaceholder="Search..."
      matchTriggerWidth
      buttonProps={{
        className: cn(
          "w-full justify-start border-gray-300 px-3",
          "data-[state=open]:ring-1 data-[state=open]:ring-gray-500 data-[state=open]:border-gray-500",
          "focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition-none",
          !value && "text-gray-400",
        ),
      }}
    />
  );
}

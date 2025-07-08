import { TooltipComponent } from "@/ui/qr-builder/components/tooltip.tsx";
import { QR_TYPE_INPUTS_CONFIG } from "@/ui/qr-builder/constants/qr-type-inputs-config.ts";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Flex, Text } from "@radix-ui/themes";
import { Info } from "lucide-react";
import { FC, useEffect } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { CheckboxWithLabel } from "./components/checkbox-with-label.tsx";
import { InputWithLabel } from "./components/input-with-label.tsx";
import { Select } from "./components/select.tsx";
import { EQRType } from "./constants/get-qr-config.ts";
import { WIFI_ENCRYPTION_TYPES } from "./constants/wifi-encryption-types.ts";

interface IQRContentBuilderProps {
  qrType: EQRType;
  isHiddenNetwork: boolean;
  onHiddenNetworkChange: (checked: boolean) => void;
  validateFields: () => void;
  homePageDemo?: boolean;
  hideNameField?: boolean;
}

export const QRCodeContentBuilder: FC<IQRContentBuilderProps> = ({
  qrType,
  isHiddenNetwork,
  onHiddenNetworkChange,
  validateFields,
  homePageDemo = false,
  hideNameField = false,
}) => {
  const { isMobile } = useMediaQuery();

  const { control } = useFormContext();

  useEffect(() => {
    if (isMobile && homePageDemo) {
      window.scrollTo({ top: 200, behavior: "smooth" });
    }
  }, [isMobile]);

  const renderCardContent = () => {
    if (!qrType) return <p className="text-neutral text-sm">Unknown QR Type</p>;

    if (qrType !== EQRType.WIFI) {
      return QR_TYPE_INPUTS_CONFIG[qrType].map((field, index) => (
        <div
          key={index}
          className={hideNameField && index === 0 ? "hidden" : ""}
        >
          <InputWithLabel
            id={field.id}
            homePageDemo={homePageDemo}
            initFromPlaceholder={field.initFromPlaceholder}
            tooltip={field.tooltip}
            {...field}
          />
        </div>
      ));
    }

    return (
      <>
        {QR_TYPE_INPUTS_CONFIG[qrType].map((field, index) => (
          <div
            key={index}
            className={hideNameField && index === 0 ? "hidden" : ""}
          >
            <InputWithLabel
              initFromPlaceholder={field.initFromPlaceholder}
              {...field}
            />
          </div>
        ))}
        <Flex
          direction="column"
          gap="4"
          justify="start"
          className="w-full basis-1/2"
        >
          <Flex direction="column" align="stretch" gap="2">
            <Flex direction="row" align="center" gap="1">
              <label className="text-neutral text-sm font-medium">
                Network Security Type
              </label>
              <TooltipComponent
                tooltip={
                  "Most routers today use WPA/WPA2. If you're not sure, choose this. You can also check on your router label."
                }
              />
            </Flex>
            <Controller
              name="networkEncryption"
              control={control}
              defaultValue={WIFI_ENCRYPTION_TYPES[0].id}
              render={({ field: { onChange, value } }) => (
                <Select
                  options={WIFI_ENCRYPTION_TYPES}
                  value={
                    WIFI_ENCRYPTION_TYPES.find((opt) => opt.id === value) ??
                    WIFI_ENCRYPTION_TYPES[0]
                  }
                  onChange={(option) => {
                    onChange(option.id);
                  }}
                />
              )}
            />
          </Flex>
          <Flex direction="row" gap="2" align="center">
            <CheckboxWithLabel
              label="Wifi is not visible to others"
              checked={isHiddenNetwork}
              onCheckedChange={onHiddenNetworkChange}
            />
            <TooltipComponent
              tooltip={
                "Enable this if your Wifi is hidden and doesn't appear when people search for networks."
              }
            />
          </Flex>
          <Flex
            align="center"
            gap="2"
            className="border-border-300 bg-border-400 h-full w-full rounded-md border p-3"
          >
            <Info className="size-5 shrink-0 text-neutral-500" />
            <Text as="p" size="1" className="text-neutral-800">
              Not sure where to find this info? Look at the label on your router
              — it usually lists your Wifi name, password, and security type.
            </Text>
          </Flex>
        </Flex>
      </>
    );
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-between gap-4 md:items-start">
      <div
        className={cn(
          "flex h-fit w-full flex-col items-center justify-center gap-6 p-0 md:max-w-[524px] md:p-0",
          {
            "border-border-100 rounded-lg border p-3 md:px-6 md:py-4":
              !homePageDemo,
          },
        )}
      >
        <form
          className="flex w-full flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            validateFields();
          }}
        >
          {renderCardContent()}
        </form>
      </div>
    </div>
  );
};

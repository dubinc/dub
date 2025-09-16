"use client";

import { CheckboxWithLabel } from "@/ui/qr-builder/components/checkbox-with-label";
import { Select } from "@/ui/qr-builder/components/select";
import { TooltipComponent } from "@/ui/qr-builder/components/tooltip";
import { WIFI_ENCRYPTION_TYPES } from "@/ui/qr-builder/constants/wifi-encryption-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flex, Text } from "@radix-ui/themes";
import { Info } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  UseFormReturn,
} from "react-hook-form";
import { EQRType } from "../../constants/get-qr-config";
import {
  QR_INPUT_PLACEHOLDERS,
  QR_NAME_PLACEHOLDERS,
} from "../../constants/qr-type-inputs-placeholders";
import { useQRFormData } from "../../hooks/use-qr-form-data";
import { WifiQRFormData, wifiQRSchema } from "../../validation/schemas";
import { BaseFormField } from "./base-form-field.tsx";

export interface WiFiFormRef {
  validate: () => Promise<boolean>;
  getValues: () => WifiQRFormData & { encodedData: string };
  form: UseFormReturn<WifiQRFormData>;
}

interface WiFiFormProps {
  onSubmit: (data: WifiQRFormData & { encodedData: string }) => void;
  defaultValues?: Partial<WifiQRFormData>;
  initialData?: {
    qrType: EQRType;
    data: string;
    link?: { url: string; title?: string };
  };
}

export const WifiForm = forwardRef<WiFiFormRef, WiFiFormProps>(
  ({ onSubmit, defaultValues, initialData }, ref) => {
    const { getDefaultValues, encodeFormData } = useQRFormData({
      qrType: EQRType.WIFI,
      initialData,
    });

    const formDefaults = getDefaultValues({
      qrName: "",
      networkName: "",
      networkPassword: "",
      networkEncryption: "WPA",
      isHiddenNetwork: false,
      ...defaultValues,
    });

    const form = useForm<WifiQRFormData>({
      resolver: zodResolver(wifiQRSchema),
      defaultValues: formDefaults,
    });

    const watchEncryption = form.watch("networkEncryption");
    const showPassword = watchEncryption !== "none";

    // Reset form when initialData changes
    useEffect(() => {
      if (initialData) {
        const newDefaults = getDefaultValues(defaultValues);
        form.reset(newDefaults);
      }
    }, [initialData, getDefaultValues, defaultValues, form]);

    useImperativeHandle(ref, () => ({
      validate: async () => {
        const result = await form.trigger();
        if (result) {
          const formData = form.getValues();
          const encodedData = encodeFormData(formData);
          onSubmit({ ...formData, encodedData });
        }
        return result;
      },
      getValues: () => {
        const formData = form.getValues();
        const encodedData = encodeFormData(formData);
        return { ...formData, encodedData };
      },
      form,
    }));

    return (
      <FormProvider {...form}>
        <form className="flex w-full flex-col gap-4">
          <BaseFormField
            name="qrName"
            label="Name your QR Code"
            placeholder={QR_NAME_PLACEHOLDERS.WIFI}
            tooltip="Only you can see this. It helps you recognize your QR codes later."
            initFromPlaceholder
          />

          <BaseFormField
            name="networkName"
            label="WiFi Network Name"
            placeholder={QR_INPUT_PLACEHOLDERS.WIFI_NETWORK_NAME}
            tooltip="This is the name of the Wi-Fi network you want to share. You can usually find it on the back of your router."
          />

          <div className="flex w-full flex-col gap-2">
            <Flex gap="1" align="center">
              <label className="text-neutral text-sm font-medium">
                Network Security Type
              </label>
              <TooltipComponent tooltip="Most routers today use WPA/WPA2. If you're not sure, choose this. You can also check on your router label." />
            </Flex>

            <Controller
              name="networkEncryption"
              control={form.control}
              render={({ field }) => (
                <Select
                  options={WIFI_ENCRYPTION_TYPES}
                  value={
                    WIFI_ENCRYPTION_TYPES.find(
                      (option) => option.id === field.value,
                    ) || null
                  }
                  onChange={(option) => field.onChange(option.id)}
                />
              )}
            />
          </div>

          {showPassword && (
            <BaseFormField
              name="networkPassword"
              label="Network Password"
              type="password"
              placeholder={QR_INPUT_PLACEHOLDERS.WIFI_PASSWORD}
              tooltip="People will automatically connect using this password after scanning your QR code."
              required={showPassword}
            />
          )}

          {/* Hidden Network Checkbox - using old component */}
          <div className="flex w-full flex-col gap-2">
            <Controller
              name="isHiddenNetwork"
              control={form.control}
              render={({ field }) => (
                <CheckboxWithLabel
                  label="WiFi is not visible to others (hidden network)"
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Info box */}
          <div className="bg-secondary-50 border-secondary-200 flex items-start gap-3 rounded-lg border p-3">
            <Info className="text-secondary mt-0.5 h-4 w-4 flex-shrink-0" />
            <Text size="2" className="text-secondary">
              Not sure where to find this info? Look at the label on your router
              — it usually lists your WiFi name, password, and security type.
            </Text>
          </div>
        </form>
      </FormProvider>
    );
  },
);

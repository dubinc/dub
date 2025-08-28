import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { getQRValidationSchema } from "@/ui/qr-builder/qr-validation-schema.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

type TQRFormValues = Record<string, string | File[] | undefined>;

interface UseQRContentFormParams {
  qrType: EQRType;
  minimalFlow?: boolean;
  initialInputValues?: TQRFormValues;
  initialIsHiddenNetwork?: boolean;
  qrTitle?: string;
  handleContent: (content: {
    inputValues: TQRFormValues;
    isHiddenNetwork: boolean;
    qrType: EQRType;
  }) => void;
}

export function useQRContentForm({
  qrType,
  minimalFlow = false,
  initialInputValues = {},
  initialIsHiddenNetwork = false,
  qrTitle,
  handleContent,
}: UseQRContentFormParams) {
  const schema = getQRValidationSchema(qrType);

  const form = useForm<TQRFormValues>({
    defaultValues: {},
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  const { watch, getValues, trigger, reset } = form;

  const inputValues = watch();

  const [isHiddenNetwork, setIsHiddenNetwork] = useState<boolean>(
    initialIsHiddenNetwork,
  );

  // Set initial values of the form when initialInputValue changes
  useEffect(() => {
    if (initialInputValues && Object.keys(initialInputValues).length > 0) {
      const valuesWithQrName = {
        ...initialInputValues,
        [`qrName-${qrType}`]: qrTitle || "QR Code",
      };
      reset(valuesWithQrName);
    }
  }, [initialInputValues, reset, qrType, qrTitle]);

  // Set isHiddenNetwork when initialIsHiddenNetwork changes
  useEffect(() => {
    setIsHiddenNetwork(initialIsHiddenNetwork);
  }, [initialIsHiddenNetwork]);

  const handleValidationAndContentSubmit = async () => {
    const valid = await trigger();

    if (valid) {
      handleContent({
        inputValues: getValues(),
        isHiddenNetwork,
        qrType,
      });
    }

    return valid;
  };

  const handleSetIsHiddenNetwork = (isChecked: boolean) => {
    setIsHiddenNetwork(isChecked);

    if (minimalFlow) {
      handleContent({ inputValues, isHiddenNetwork: isChecked, qrType });
    }
  };

  return {
    form,
    isHiddenNetwork,
    setIsHiddenNetwork,
    handleValidationAndContentSubmit,
    handleSetIsHiddenNetwork,
  };
}

import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { getQRValidationSchema } from "@/ui/qr-builder/qr-validation-schema.ts";
import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm } from "react-hook-form";

type TQRFormValues = Record<string, string | File[] | undefined>;

interface UseQRContentFormParams {
  qrType: EQRType;
  minimalFlow?: boolean;
  initialInputValues?: TQRFormValues;
  initialIsHiddenNetwork?: boolean;
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
  handleContent,
}: UseQRContentFormParams) {
  const schema = getQRValidationSchema(qrType);

  const form = useForm<TQRFormValues>({
    defaultValues: initialInputValues,
    resolver: yupResolver(schema),
    mode: "onBlur",
  });

  const { watch, getValues, trigger } = form;

  const inputValues = watch();

  console.log("[FORM] inputValues", inputValues);

  const [isHiddenNetwork, setIsHiddenNetwork] = useState<boolean>(
    initialIsHiddenNetwork,
  );

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

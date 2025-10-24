"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useQrBuilderContext } from "../context/qr-builder-context";
import { QrFormResolver } from "../forms/qr-form-resolver.tsx";
import { QRFormRef } from "../forms/types";

export interface QRContentStepRef {
  validateForm: () => Promise<boolean>;
  form: any;
  getValues: () => any;
}

export const QrContentStep = forwardRef<QRContentStepRef, {}>((_, ref) => {
  const {
    selectedQrType,
    handleFormSubmit,
    formData,
    updateCurrentFormValues,
    initialQrData,
  } = useQrBuilderContext();
  const formRef = useRef<QRFormRef>(null);

  useImperativeHandle(ref, () => ({
    validateForm: async () => {
      if (formRef.current) {
        return await formRef.current.validate();
      }
      return false;
    },
    form: formRef.current?.form,
    getValues: () => {
      if (formRef.current) {
        return formRef.current.getValues();
      }
      return null;
    },
  }));

  useEffect(() => {
    if (formRef.current?.form) {
      const subscription = formRef.current.form.watch((values) => {
        updateCurrentFormValues(values);
      });

      return () => subscription.unsubscribe();
    }
  }, [selectedQrType, updateCurrentFormValues]);

  if (!selectedQrType) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <p>Please select a QR code type first.</p>
      </div>
    );
  }

  return (
    <QrFormResolver
      ref={formRef}
      qrType={selectedQrType}
      onSubmit={handleFormSubmit}
      defaultValues={formData || undefined}
      initialData={
        initialQrData
          ? {
              qrType: initialQrData.qrType,
              data: initialQrData.data,
              link: initialQrData.link,
              fileId: initialQrData.fileId,
            }
          : undefined
      }
    />
  );
});

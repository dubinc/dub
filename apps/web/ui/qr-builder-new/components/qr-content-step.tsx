"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useQrBuilderContext } from "../context/qr-builder-context";
import { QrFormResolver } from "../forms/qr-form-resolver.tsx";
import { QRFormRef } from "../forms/types";

export interface QRContentStepRef {
  validateForm: () => Promise<boolean>;
}

export const QrContentStep = forwardRef<QRContentStepRef, {}>((_, ref) => {
  const {
    selectedQrType,
    handleFormSubmit,
    formData,
    updateCurrentFormValues,
    initialQrData,
    setIsFormValid,
  } = useQrBuilderContext();
  const formRef = useRef<QRFormRef>(null);

  useImperativeHandle(ref, () => ({
    validateForm: async () => {
      if (formRef.current) {
        return await formRef.current.validate();
      }
      return false;
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

  // Track form validation state and update context
  useEffect(() => {
    if (formRef.current?.form) {
      // Trigger initial validation
      formRef.current.form.trigger().then((isValid) => {
        setIsFormValid(isValid);
      });

      // Subscribe to form value changes
      const subscription = formRef.current.form.watch(async () => {
        // Trigger validation on every change
        const isValid = await formRef.current?.form.trigger();
        setIsFormValid(isValid || false);
      });

      return () => subscription.unsubscribe();
    }
  }, [formRef.current?.form, setIsFormValid]);

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

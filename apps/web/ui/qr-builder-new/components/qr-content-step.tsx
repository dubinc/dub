"use client";

import { useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { useQrBuilder } from "../context/qr-builder-context";
import { QrFormResolver } from "../forms/qr-form-resolver.tsx";
import { QRFormRef } from "../forms/types";

export interface QRContentStepRef {
  validateForm: () => Promise<boolean>;
}

export const QrContentStep = forwardRef<QRContentStepRef, {}>((_, ref) => {
  const { selectedQrType, handleFormSubmit, formData, updateCurrentFormValues } = useQrBuilder();
  const formRef = useRef<QRFormRef>(null);

  useImperativeHandle(ref, () => ({
    validateForm: async () => {
      if (formRef.current) {
        return await formRef.current.validate();
      }
      return false;
    },
  }));

  // Watch form values and update context for real-time demo updates
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
      />
  );
});
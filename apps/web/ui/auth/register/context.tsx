"use client";

import React, { createContext, useContext, useState } from "react";
import { ERegistrationStep } from "./constants";

interface RegisterContextType {
  email: string;
  password: string;
  step: ERegistrationStep;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setStep: (step: ERegistrationStep) => void;
}

const RegisterContext = createContext<RegisterContextType | undefined>(
  undefined,
);

export const RegisterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<ERegistrationStep>(ERegistrationStep.SIGNUP);

  return (
    <RegisterContext.Provider
      value={{ email, password, step, setEmail, setPassword, setStep }}
    >
      {children}
    </RegisterContext.Provider>
  );
};

export const useRegisterContext = () => {
  const context = useContext(RegisterContext);

  if (context === undefined) {
    throw new Error(
      "useRegisterContext must be used within a RegisterProvider",
    );
  }

  return context;
};

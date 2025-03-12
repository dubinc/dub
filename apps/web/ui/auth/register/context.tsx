"use client";

import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useState,
} from "react";

interface RegisterContextType {
  email: string;
  password: string;
  step: "signup" | "verify";
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setStep: (step: "signup" | "verify") => void;
  lockEmail?: boolean;
}

const RegisterContext = createContext<RegisterContextType | undefined>(
  undefined,
);

export const RegisterProvider: React.FC<
  PropsWithChildren<{ email?: string; lockEmail?: boolean }>
> = ({ email: emailProp, lockEmail, children }) => {
  const [email, setEmail] = useState(emailProp ?? "");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"signup" | "verify">("signup");

  return (
    <RegisterContext.Provider
      value={{
        email,
        password,
        step,
        setEmail,
        setPassword,
        setStep,
        lockEmail,
      }}
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

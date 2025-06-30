"use client";

import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from "react";

interface Account {
  name?: string;
  email: string;
  avatarUrl?: string;
}

export interface FormContextType {
  sourceAccount: Account;
  targetAccount: Account;
  setSourceAccount: Dispatch<SetStateAction<Account>>;
  setTargetAccount: Dispatch<SetStateAction<Account>>;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const MergePartnerAccountsFormProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [sourceAccount, setSourceAccount] = useState<Account>({
    email: "",
  });

  const [targetAccount, setTargetAccount] = useState<Account>({
    email: "",
  });

  return (
    <FormContext.Provider
      value={{
        sourceAccount,
        targetAccount,
        setSourceAccount,
        setTargetAccount,
      }}
    >
      {children}
    </FormContext.Provider>
  );
};

export const useMergePartnerAccountsForm = () => {
  const context = useContext(FormContext);

  if (!context) {
    throw new Error("Must be used within a Provider.");
  }

  return context;
};

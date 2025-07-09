"use client";

import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useState,
} from "react";

export const BrandingContext = createContext<{
  isGeneratingLander: boolean;
  setIsGeneratingLander: Dispatch<SetStateAction<boolean>>;
}>({
  isGeneratingLander: false,
  setIsGeneratingLander: () => {},
});

export const useBrandingContext = () => useContext(BrandingContext);

export function BrandingContextProvider({ children }: PropsWithChildren) {
  const [isGeneratingLander, setIsGeneratingLander] = useState(false);

  return (
    <BrandingContext.Provider
      value={{
        isGeneratingLander,
        setIsGeneratingLander,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

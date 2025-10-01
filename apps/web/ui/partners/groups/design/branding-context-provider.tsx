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
  isGenerateBannerHidden: boolean;
  setIsGenerateBannerHidden: Dispatch<SetStateAction<boolean>>;
}>({
  isGeneratingLander: false,
  setIsGeneratingLander: () => {},
  isGenerateBannerHidden: false,
  setIsGenerateBannerHidden: () => {},
});

export const useBrandingContext = () => useContext(BrandingContext);

export function BrandingContextProvider({ children }: PropsWithChildren) {
  const [isGeneratingLander, setIsGeneratingLander] = useState(false);
  const [isGenerateBannerHidden, setIsGenerateBannerHidden] = useState(false);

  return (
    <BrandingContext.Provider
      value={{
        isGeneratingLander,
        setIsGeneratingLander,
        isGenerateBannerHidden,
        setIsGenerateBannerHidden,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

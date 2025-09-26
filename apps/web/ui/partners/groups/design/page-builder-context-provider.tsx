"use client";

import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useState,
} from "react";

export const PageBuilderContext = createContext<{
  isGeneratingLander: boolean;
  setIsGeneratingLander: Dispatch<SetStateAction<boolean>>;
  isGenerateBannerHidden: boolean;
  setIsGenerateBannerHidden: Dispatch<SetStateAction<boolean>>;
}>({
  isGeneratingLander: false,
  setIsGeneratingLander: () => { },
  isGenerateBannerHidden: false,
  setIsGenerateBannerHidden: () => { },
});

export const usePageBuilderContext = () => useContext(PageBuilderContext);

export function PageBuilderContextProvider({ children }: PropsWithChildren) {
  const [isGeneratingLander, setIsGeneratingLander] = useState(false);
  const [isGenerateBannerHidden, setIsGenerateBannerHidden] = useState(false);

  return (
    <PageBuilderContext.Provider
      value={{
        isGeneratingLander,
        setIsGeneratingLander,
        isGenerateBannerHidden,
        setIsGenerateBannerHidden,
      }}
    >
      {children}
    </PageBuilderContext.Provider>
  );
}

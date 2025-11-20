"use client";

import { GroupProps, GroupWithProgramProps } from "@/lib/types";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useState,
} from "react";
import { KeyedMutator } from "swr";

type BrandingContextProviderProps = {
  defaultGroup: GroupProps;
  group: GroupWithProgramProps;
  mutateGroup: KeyedMutator<GroupWithProgramProps>;
};

export const BrandingContext = createContext<
  | ({
      isGeneratingLander: boolean;
      setIsGeneratingLander: Dispatch<SetStateAction<boolean>>;
      isGenerateBannerHidden: boolean;
      setIsGenerateBannerHidden: Dispatch<SetStateAction<boolean>>;
    } & BrandingContextProviderProps)
  | null
>(null);

export const useBrandingContext = () => {
  const context = useContext(BrandingContext);
  if (!context)
    throw new Error(
      "useBrandingContext must be used within a BrandingContextProvider",
    );
  return context;
};

export function BrandingContextProvider({
  children,
  ...rest
}: PropsWithChildren<BrandingContextProviderProps>) {
  const [isGeneratingLander, setIsGeneratingLander] = useState(false);
  const [isGenerateBannerHidden, setIsGenerateBannerHidden] = useState(false);

  return (
    <BrandingContext.Provider
      value={{
        isGeneratingLander,
        setIsGeneratingLander,
        isGenerateBannerHidden,
        setIsGenerateBannerHidden,
        ...rest,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

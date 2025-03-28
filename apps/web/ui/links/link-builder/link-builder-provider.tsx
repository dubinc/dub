import { ExpandedLinkProps } from "@/lib/types";
import { DEFAULT_LINK_PROPS } from "@dub/utils";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useState,
} from "react";
import { FormProvider, useForm } from "react-hook-form";

export type LinkFormData = ExpandedLinkProps;

export type LinkBuilderProps = {
  props?: ExpandedLinkProps;
  duplicateProps?: ExpandedLinkProps;
  homepageDemo?: boolean;
  workspace?: { plan?: string; conversionEnabled?: boolean };
};

const LinkBuilderContext = createContext<
  LinkBuilderProps & {
    generatingMetatags: boolean;
    setGeneratingMetatags: Dispatch<SetStateAction<boolean>>;
  }
>({ generatingMetatags: false, setGeneratingMetatags: () => {} });

export function useLinkBuilderContext() {
  return useContext(LinkBuilderContext);
}

export function LinkBuilderProvider({
  children,
  ...rest
}: PropsWithChildren<LinkBuilderProps>) {
  const { plan, conversionEnabled } = rest.workspace || {};

  const [generatingMetatags, setGeneratingMetatags] = useState(false);

  const form = useForm<LinkFormData>({
    defaultValues: rest.props ||
      rest.duplicateProps || {
        ...DEFAULT_LINK_PROPS,
        trackConversion:
          (plan && plan !== "free" && plan !== "pro" && conversionEnabled) ||
          false,
      },
  });

  return (
    <LinkBuilderContext.Provider
      value={{ ...rest, generatingMetatags, setGeneratingMetatags }}
    >
      <FormProvider {...form}>{children}</FormProvider>
    </LinkBuilderContext.Provider>
  );
}

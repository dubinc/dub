import useWorkspace from "@/lib/swr/use-workspace";
import { ExpandedLinkProps } from "@/lib/types";
import { DEFAULT_LINK_PROPS } from "@dub/utils";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { FormProvider, useForm } from "react-hook-form";

export type LinkFormData = ExpandedLinkProps;

export type LinkBuilderProps = {
  props?: ExpandedLinkProps;
  duplicateProps?: ExpandedLinkProps;
  modal: boolean;
};

const LinkBuilderContext = createContext<
  | (LinkBuilderProps & {
      generatingMetatags: boolean;
      setGeneratingMetatags: Dispatch<SetStateAction<boolean>>;
    })
  | null
>(null);

export function useLinkBuilderContext() {
  const context = useContext(LinkBuilderContext);
  if (!context)
    throw new Error(
      "useLinkBuilderContext must be used within a LinkBuilderProvider",
    );

  return context;
}

export function LinkBuilderProvider({
  children,
  ...rest
}: PropsWithChildren<LinkBuilderProps>) {
  const { plan, conversionEnabled } = useWorkspace();

  const [generatingMetatags, setGeneratingMetatags] = useState(
    Boolean(rest.props),
  );

  const form = useForm<LinkFormData>({
    defaultValues: rest.props ||
      rest.duplicateProps || {
        ...DEFAULT_LINK_PROPS,
        trackConversion:
          (plan && plan !== "free" && plan !== "pro" && conversionEnabled) ||
          false,
      },
  });

  // Keep the first A/B test variant in sync with the destination URL – they
  // represent the same URL (the modal writes testVariants[0].url back to url)
  useEffect(() => {
    const { unsubscribe } = form.watch(
      ({ url, testVariants, testCompletedAt }, { name }) => {
        if (name !== "url" || !Array.isArray(testVariants)) return;

        const firstVariant = testVariants[0];
        if (!firstVariant) return;

        // Don't rewrite the variants of a completed test (<= so a test ended
        // in this same tick already counts as completed)
        if (testCompletedAt && new Date(testCompletedAt) <= new Date()) return;

        if (firstVariant.url !== url)
          form.setValue(
            "testVariants",
            [
              { ...firstVariant, url: url ?? "" },
              ...testVariants.slice(1),
            ] as LinkFormData["testVariants"],
            { shouldDirty: true },
          );
      },
    );

    return () => unsubscribe();
  }, [form]);

  return (
    <LinkBuilderContext.Provider
      value={{ ...rest, generatingMetatags, setGeneratingMetatags }}
    >
      <FormProvider {...form}>{children}</FormProvider>
    </LinkBuilderContext.Provider>
  );
}

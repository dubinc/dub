import { LinkFormData } from "@/ui/links/link-builder/link-builder-provider";
import { forwardRef, memo } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { ShortLinkInput } from "../../short-link-input";
import { useAvailableDomains } from "../../use-available-domains";
import { useLinkBuilderContext } from "../link-builder-provider";

/**
 * Wraps the ShortLinkInput component with link-builder-specific context & logic
 * @see ShortLinkInput
 */
export const LinkBuilderShortLinkInput = memo(
  forwardRef<HTMLInputElement>((_, ref) => {
    const { props } = useLinkBuilderContext();
    const { control, setValue, clearErrors } = useFormContext<LinkFormData>();

    const { errors, isSubmitting, isSubmitSuccessful } = useFormState({
      control,
      name: ["key"],
    });
    const [domain, key, url, title, description] = useWatch({
      control,
      name: ["domain", "key", "url", "title", "description"],
    });

    const { loading } = useAvailableDomains({
      currentDomain: domain,
    });

    return key !== "_root" ? (
      <ShortLinkInput
        ref={ref}
        domain={domain}
        _key={key}
        existingLinkProps={props}
        error={errors.key?.message || undefined}
        onChange={(d) => {
          clearErrors("key");
          if (d.domain !== undefined)
            setValue("domain", d.domain, { shouldDirty: true });
          if (d.key !== undefined)
            setValue("key", d.key, { shouldDirty: true });
        }}
        data={{ url, title, description }}
        saving={isSubmitting || isSubmitSuccessful}
        loading={loading}
      />
    ) : null;
  }),
);

LinkBuilderShortLinkInput.displayName = "LinkBuilderShortLinkInput";

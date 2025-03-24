"use client";

import { DomainProps } from "@/lib/types";
import {
  InfoTooltip,
  SimpleTooltipContent,
  useMediaQuery,
  UTM_PARAMETERS,
} from "@dub/ui";
import { getParamsFromURL } from "@dub/utils";
import { forwardRef, HTMLProps, ReactNode, useId } from "react";
import { useFormContext } from "react-hook-form";
import { LinkFormData } from "../modals/link-builder";
import { AlertCircleFill } from "../shared/icons";
import { ProBadgeTooltip } from "../shared/pro-badge-tooltip";

type DestinationUrlInputProps = {
  _key?: string;
  domain?: string;
  domains: DomainProps[];
  error?: string;
  right?: ReactNode;
} & HTMLProps<HTMLInputElement>;

export const DestinationUrlInput = forwardRef<
  HTMLInputElement,
  DestinationUrlInputProps
>(
  (
    {
      _key: key,
      domain,
      domains,
      error,
      right,
      ...inputProps
    }: DestinationUrlInputProps,
    ref,
  ) => {
    const inputId = useId();
    const { isMobile } = useMediaQuery();

    const formContext = useFormContext<LinkFormData>();

    return (
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label
              htmlFor={inputId}
              className="block text-sm font-medium text-neutral-700"
            >
              Destination URL
            </label>
            {key === "_root" ? (
              <ProBadgeTooltip
                content={
                  <SimpleTooltipContent
                    title="The URL your users will get redirected to when they visit your root domain link."
                    cta="Learn more."
                    href="https://dub.co/help/article/how-to-redirect-root-domain"
                  />
                }
              />
            ) : (
              <InfoTooltip
                content={
                  <SimpleTooltipContent
                    title="The URL your users will get redirected to when they visit your short link."
                    cta="Learn more."
                    href="https://dub.co/help/article/how-to-create-link"
                  />
                }
              />
            )}
          </div>
          {right}
        </div>
        <div className="relative mt-2 flex rounded-md shadow-sm">
          <input
            ref={ref}
            name="url"
            id={inputId}
            placeholder={
              domains?.find(({ slug }) => slug === domain)?.placeholder ||
              "https://dub.co/help/article/what-is-dub"
            }
            autoFocus={!key && !isMobile}
            autoComplete="off"
            className={`${
              error
                ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500"
            } block w-full rounded-md focus:outline-none sm:text-sm`}
            aria-invalid="true"
            {...inputProps}
            {...(formContext && {
              onChange: (e) => {
                const url = e.target.value;

                formContext.setValue("url", url);
                const parentParams = getParamsFromURL(url);

                UTM_PARAMETERS.filter((p) => p.key !== "ref").forEach((p) =>
                  formContext.setValue(p.key as any, parentParams?.[p.key], {
                    shouldDirty: true,
                  }),
                );
              },
            })}
          />
          {error && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <AlertCircleFill
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600" id="key-error">
            {error}
          </p>
        )}
      </div>
    );
  },
);

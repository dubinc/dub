import { sanitizeSocialHandle, sanitizeWebsite, SocialPlatform } from "@/lib/social-utils";
import { programApplicationFormSiteSchema, programApplicationFormWebsiteAndSocialsFieldSchema, programApplicationFormWebsiteAndSocialsFieldWithValueSchema } from "@/lib/zod/schemas/program-application-form";
import { cn } from "@dub/utils";
import { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { z } from "zod";
import { FormControl } from "./form-control";

type WebsiteAndSocialsFieldData = z.infer<
  typeof programApplicationFormWebsiteAndSocialsFieldSchema
>

type WebsiteAndSocialsSiteData = z.infer<typeof programApplicationFormSiteSchema>

const Field = ({
  keyPath: keyPathProp,
  field,
  preview,
}: {
  keyPath?: string;
  field: WebsiteAndSocialsSiteData
  preview?: boolean;
}) => {
  const { register, getFieldState, watch, setValue } = useFormContext<any>();
  const keyPath = keyPathProp ? `${keyPathProp}.value` : "value";
  const state = getFieldState(keyPath);
  const error = !!state.error

  const onPasteSocial = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>, platform: SocialPlatform) => {
      const text = e.clipboardData.getData("text/plain");
      const sanitized = sanitizeSocialHandle(text, platform);

      if (sanitized) {
        setValue(keyPath, sanitized);
        e.preventDefault();
      }
    },
    [setValue, keyPath],
  );

  const onPasteWebsite = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData("text/plain");
      const sanitized = sanitizeWebsite(text);

      if (sanitized) {
        setValue(keyPath, sanitized);
        e.preventDefault();
      }
    },
    [setValue, keyPath],
  );

  switch (field.type) {
    case "website":
      return (
        <FormControl
          required={field.required}
          label="Website"
        >
          <input
            type="text"
            className={cn(
              "block w-full rounded-md focus:outline-none text-sm min-h-10",
              error
                ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
            )}
            placeholder=""
            onPaste={onPasteWebsite}
            {...(preview ? {} : register(keyPath, { required: field.required }))}
          />
        </FormControl>
      );
    case "youtube":
      return (
        <FormControl
          required={field.required}
          label="YouTube"
        >
          <div className="flex rounded-md bg-white">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 px-3 text-neutral-800 font-medium text-sm">
              youtube.com/
            </span>
            <input
              type="text"
              className={cn(
                "block w-full rounded-none rounded-r-md focus:outline-none text-sm min-h-10",
                error
                  ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
              )}
              placeholder="handle"
              onPaste={(e) => onPasteSocial(e, "youtube")}
              {...(preview ? {} : register(keyPath, { required: field.required }))}
            />
          </div>
        </FormControl>
      );
    case "twitter":
      return (
        <FormControl
          required={field.required}
          label="X/Twitter"
        >
          <div className="flex rounded-md bg-white">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 px-3 text-neutral-800 font-medium text-sm">
              x.com/
            </span>
            <input
              type="text"
              className={cn(
                "block w-full rounded-none rounded-r-md focus:outline-none text-sm min-h-10",
                error
                  ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
              )}
              placeholder="handle"
              onPaste={(e) => onPasteSocial(e, "twitter")}
              {...(preview ? {} : register(keyPath, { required: field.required }))}
            />
          </div>
        </FormControl>
      );
    case "linkedin":
      return (
        <FormControl
          required={field.required}
          label="LinkedIn"
        >
          <div className="flex rounded-md bg-white">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 px-3 text-neutral-800 font-medium text-sm">
              linkedin.com/in/
            </span>
            <input
              type="text"
              className={cn(
                "block w-full rounded-none rounded-r-md focus:outline-none text-sm min-h-10",
                error
                  ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
              )}
              placeholder="handle"
              onPaste={(e) => onPasteSocial(e, "linkedin")}
              {...(preview ? {} : register(keyPath, { required: field.required }))}
            />
          </div>
        </FormControl>
      );
    case "instagram":
      return (
        <FormControl
          required={field.required}
          label="Instagram"
        >
          <div className="flex rounded-md bg-white">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 px-3 text-neutral-800 font-medium text-sm">
              instagram.com/
            </span>
            <input
              type="text"
              className={cn(
                "block w-full rounded-none rounded-r-md focus:outline-none text-sm min-h-10",
                error
                  ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
              )}
              placeholder="handle"
              onPaste={(e) => onPasteSocial(e, "instagram")}
              {...(preview ? {} : register(keyPath, { required: field.required }))}
            />
          </div>
        </FormControl>
      );
    case "tiktok":
      return (
        <FormControl
          required={field.required}
          label="TikTok"
        >
          <div className="flex rounded-md bg-white">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 px-3 text-neutral-800 font-medium text-sm">
              tiktok.com/
            </span>
            <input
              type="text"
              className={cn(
                "block w-full rounded-none rounded-r-md focus:outline-none text-sm min-h-10",
                error
                  ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
              )}
              placeholder="handle"
              onPaste={(e) => onPasteSocial(e, "tiktok")}
              {...(preview ? {} : register(keyPath, { required: field.required }))}
            />
          </div>
        </FormControl>
      );
    default:
      return null;
  }

}

export function WebsiteAndSocialsField({
  keyPath,
  field,
  preview,
}: {
  keyPath?: string;
  field: WebsiteAndSocialsFieldData;
  preview?: boolean;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-5 text-left")}>
      {field.data.map((fieldData, index) => (
        <Field
          key={index}
          field={fieldData}
          keyPath={`${keyPath}.data.${index}`}
          preview={preview} />
      ))}
    </div >
  );
}

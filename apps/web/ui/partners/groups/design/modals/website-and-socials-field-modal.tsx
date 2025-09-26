"use client";

import { programApplicationFormSiteSchema, programApplicationFormWebsiteAndSocialsFieldSchema } from "@/lib/zod/schemas/program-application-form";
import { Button, Globe, Instagram, LinkedIn, Modal, Switch, TikTok, Twitter, YouTube } from "@dub/ui";
import { Dispatch, SetStateAction, useCallback, useId } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion } from "framer-motion";
import { v4 as uuid } from "uuid";

type WebsiteAndSocialsFieldData = z.infer<
  typeof programApplicationFormWebsiteAndSocialsFieldSchema
>

type WebsiteAndSocialsSiteData = z.infer<typeof programApplicationFormSiteSchema>

type WebsiteAndSocialsFieldDataType = z.infer<
  typeof programApplicationFormSiteSchema
>["type"]

type WebsiteAndSocialsFieldModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  defaultValues?: WebsiteAndSocialsFieldData
  onSubmit: (data: WebsiteAndSocialsFieldData) => void;
};

export function WebsiteAndSocialsFieldModal(
  props: WebsiteAndSocialsFieldModalProps,
) {
  return (
    <Modal showModal={props.showModal} setShowModal={props.setShowModal}>
      <WebsiteAndSocialsFieldModalInner {...props} />
    </Modal>
  );
}

function WebsiteAndSocialsFieldModalInner({
  setShowModal,
  onSubmit,
  defaultValues,
}: WebsiteAndSocialsFieldModalProps) {
  const id = useId();

  const {
    handleSubmit,
    watch,
    setValue,
  } = useForm<WebsiteAndSocialsFieldData>({
    defaultValues: defaultValues ?? {
      id: uuid(),
      type: "website-and-socials",
      data: [],
    },
  });
  const data = watch("data")

  const addSite = useCallback((type: WebsiteAndSocialsFieldDataType) => {
    setValue(`data`, [...data, { type, required: false }], { shouldDirty: true });
  }, [data, setValue]);

  const removeSite = useCallback((type: WebsiteAndSocialsFieldDataType) => {
    setValue(`data`, data.filter((site) => site.type !== type), { shouldDirty: true });
  }, [data, setValue]);

  const getSite = useCallback((type: WebsiteAndSocialsFieldDataType) => {
    return data.find((site) => site.type === type);
  }, [data]);

  const updateSite = useCallback((type: WebsiteAndSocialsFieldDataType, updatedData: Pick<WebsiteAndSocialsSiteData, "required">) => {
    const index = data.findIndex((site) => site.type === type);

    if (index === -1) {
      setValue(`data`, [...data, { type, ...updatedData }], { shouldDirty: true });
    } else {
      setValue(`data.${index}`, { type, ...updatedData }, { shouldDirty: true });
    }
  }, [data, setValue]);

  return (
    <>
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          {defaultValues ? "Edit" : "Add"} website and socials
        </h3>

        <form
          className="mt-4"
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(async (data) => {
              setShowModal(false);
              onSubmit({
                ...data,
                data: data.data,
              });
            })(e);
          }}
        >
          <div className="flex flex-col gap-4">
            <SiteControl
              id={id}
              type="website"
              icon={Globe}
              label="Website"
              data={getSite("website")}
              addSite={addSite}
              removeSite={removeSite}
              updateSite={updateSite}
            />

            <SiteControl
              id={id}
              type="instagram"
              icon={Instagram}
              label="Instagram"
              data={getSite("instagram")}
              addSite={addSite}
              removeSite={removeSite}
              updateSite={updateSite}
            />

            <SiteControl
              id={id}
              type="youtube"
              icon={YouTube}
              label="YouTube"
              data={getSite("youtube")}
              addSite={addSite}
              removeSite={removeSite}
              updateSite={updateSite}
            />

            <SiteControl
              id={id}
              type="twitter"
              icon={Twitter}
              label="X/Twitter"
              data={getSite("twitter")}
              addSite={addSite}
              removeSite={removeSite}
              updateSite={updateSite}
            />

            <SiteControl
              id={id}
              type="tiktok"
              icon={TikTok}
              label="TikTok"
              data={getSite("tiktok")}
              addSite={addSite}
              removeSite={removeSite}
              updateSite={updateSite}
            />

            <SiteControl
              id={id}
              type="linkedin"
              icon={LinkedIn}
              label="LinkedIn"
              data={getSite("linkedin")}
              addSite={addSite}
              removeSite={removeSite}
              updateSite={updateSite}
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              onClick={() => setShowModal(false)}
              variant="secondary"
              text="Cancel"
              className="h-8 w-fit px-3"
            />
            <Button
              type="submit"
              variant="primary"
              text={defaultValues ? "Update" : "Add"}
              className="h-8 w-fit px-3"
            />
          </div>
        </form>
      </div>
    </>
  );
}

function SiteControl({
  id,
  type,
  icon: Icon,
  label,
  data,
  addSite,
  removeSite,
  updateSite,
}: {
  id: string;
  type: WebsiteAndSocialsFieldDataType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  data: WebsiteAndSocialsSiteData | undefined;
  addSite: (type: WebsiteAndSocialsFieldDataType) => void;
  removeSite: (type: WebsiteAndSocialsFieldDataType) => void;
  updateSite: (type: WebsiteAndSocialsFieldDataType, data: Pick<WebsiteAndSocialsSiteData, "required">) => void;
}) {
  const enabled = !!data;

  return (
    <div className="rounded-lg overflow-hidden bg-neutral-50 outline outline-1 -outline-offset-1 outline-border-subtle">
      <label className="flex items-center justify-between gap-1.5 px-3 py-2.5 bg-white rounded-lg  border border-border-subtle" htmlFor={`${id}-${type}`}>
        <div className="flex items-center gap-1.5">
          <Icon className="size-4" />
          <span className="text-sm font-semibold text-neutral-800">
            {label}
          </span>
        </div>
        <Switch
          id={`${id}-${type}`}
          checked={enabled}
          fn={(checked) => {
            if (checked) {
              addSite(type)
            } else {
              removeSite(type)
            }
          }}
          trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20 w-7 h-4"
          thumbDimensions="size-3"
          thumbTranslate="translate-x-3"
        />
      </label>

      <motion.div
        animate={{
          height: enabled ? "auto" : 0,
          overflow: "hidden",
        }}
        transition={{
          duration: 0.15,
        }}
        initial={false}
      >
        <label className="flex items-center justify-between gap-1.5 px-3 py-2.5" htmlFor={`${id}-${type}-required`}>
          <span className="text-sm font-medium text-neutral-800">
            Required
          </span>
          <Switch
            id={`${id}-${type}-required`}
            checked={data?.required ?? false}
            fn={(checked) => {
              updateSite(type, { required: checked })
            }}
            trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20 w-7 h-4"
            thumbDimensions="size-3"
            thumbTranslate="translate-x-3"
          />
        </label>
      </motion.div>
    </div>
  );
}

export function WebsiteAndSocialsFieldIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-12">
      <rect x="0.5" y="0.5" width="47" height="47" rx="5.5" fill="white" />
      <rect x="0.5" y="0.5" width="47" height="47" rx="5.5" stroke="#E5E5E5" />
      <g clip-path="url(#clip0_2001_4183)">
        <path d="M24 26.3337C27.1142 26.3337 29.6389 25.289 29.6389 24.0003C29.6389 22.7117 27.1142 21.667 24 21.667C20.8857 21.667 18.3611 22.7117 18.3611 24.0003C18.3611 25.289 20.8857 26.3337 24 26.3337Z" stroke="#404040" stroke-width="1.3125" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M24.0003 29.6396C25.289 29.6396 26.3337 27.115 26.3337 24.0007C26.3337 20.8864 25.289 18.3618 24.0003 18.3618C22.7117 18.3618 21.667 20.8864 21.667 24.0007C21.667 27.115 22.7117 29.6396 24.0003 29.6396Z" stroke="#404040" stroke-width="1.3125" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M24 29.6396C27.1142 29.6396 29.6389 27.115 29.6389 24.0007C29.6389 20.8864 27.1142 18.3618 24 18.3618C20.8857 18.3618 18.3611 20.8864 18.3611 24.0007C18.3611 27.115 20.8857 29.6396 24 29.6396Z" stroke="#404040" stroke-width="1.3125" stroke-linecap="round" stroke-linejoin="round" />
      </g>
      <path d="M24.9451 39.9317C24.3036 37.8177 25.4972 35.584 27.6111 34.9424C29.725 34.3009 31.9588 35.4945 32.6003 37.6084C33.2419 39.7223 32.0483 41.9561 29.9344 42.5976C27.8204 43.2392 25.5867 42.0456 24.9451 39.9317Z" fill="#FF004F" />
      <path d="M9.8241 29.7136C11.6363 28.4502 14.1296 28.8951 15.393 30.7073C16.6564 32.5196 16.2115 35.0128 14.3993 36.2762C12.587 37.5396 10.0938 37.0947 8.83037 35.2825C7.56698 33.4703 8.01188 30.977 9.8241 29.7136Z" fill="#155DFC" />
      <path d="M14.8694 12.1751C16.631 13.5082 16.9783 16.017 15.6452 17.7785C14.3121 19.5401 11.8033 19.8874 10.0418 18.5543C8.28021 17.2212 7.93288 14.7125 9.26599 12.9509C10.5991 11.1894 13.1078 10.842 14.8694 12.1751Z" fill="#0A66C2" />
      <path d="M33.1086 11.5538C32.3851 13.6411 30.1065 14.7467 28.0191 14.0232C25.9318 13.2997 24.8263 11.021 25.5498 8.93374C26.2733 6.84644 28.5519 5.74086 30.6392 6.46437C32.7265 7.18788 33.8321 9.46649 33.1086 11.5538Z" fill="#FF0000" />
      <path d="M39.3357 28.7083C37.127 28.6652 35.3714 26.8398 35.4145 24.631C35.4576 22.4223 37.283 20.6667 39.4917 20.7098C41.7005 20.7529 43.456 22.5783 43.413 24.7871C43.3699 26.9958 41.5444 28.7514 39.3357 28.7083Z" fill="#00F2EA" />
      <defs>
        <clipPath id="clip0_2001_4183">
          <rect width="14" height="14" fill="white" transform="translate(17 17)" />
        </clipPath>
      </defs>
    </svg>
  )
}
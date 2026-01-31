"use client";

import {
  programApplicationFormSiteSchema,
  programApplicationFormWebsiteAndSocialsFieldSchema,
} from "@/lib/zod/schemas/program-application-form";
import {
  Button,
  Globe,
  Instagram,
  LinkedIn,
  Modal,
  Switch,
  TikTok,
  Twitter,
  YouTube,
} from "@dub/ui";
import { motion } from "motion/react";
import { Dispatch, SetStateAction, useCallback, useId } from "react";
import { useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import * as z from "zod/v4";

type WebsiteAndSocialsFieldData = z.infer<
  typeof programApplicationFormWebsiteAndSocialsFieldSchema
>;

type WebsiteAndSocialsSiteData = z.infer<
  typeof programApplicationFormSiteSchema
>;

type WebsiteAndSocialsFieldDataType = z.infer<
  typeof programApplicationFormSiteSchema
>["type"];

type WebsiteAndSocialsFieldModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  defaultValues?: WebsiteAndSocialsFieldData;
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

  const { handleSubmit, watch, setValue } = useForm<WebsiteAndSocialsFieldData>(
    {
      defaultValues: defaultValues ?? {
        id: uuid(),
        type: "website-and-socials",
        data: [],
      },
    },
  );
  const data = watch("data");

  const addSite = useCallback(
    (type: WebsiteAndSocialsFieldDataType) => {
      setValue(`data`, [...data, { type, required: false }], {
        shouldDirty: true,
      });
    },
    [data, setValue],
  );

  const removeSite = useCallback(
    (type: WebsiteAndSocialsFieldDataType) => {
      setValue(
        `data`,
        data.filter((site) => site.type !== type),
        { shouldDirty: true },
      );
    },
    [data, setValue],
  );

  const getSite = useCallback(
    (type: WebsiteAndSocialsFieldDataType) => {
      return data.find((site) => site.type === type);
    },
    [data],
  );

  const updateSite = useCallback(
    (
      type: WebsiteAndSocialsFieldDataType,
      updatedData: Pick<WebsiteAndSocialsSiteData, "required">,
    ) => {
      const index = data.findIndex((site) => site.type === type);

      if (index === -1) {
        setValue(`data`, [...data, { type, ...updatedData }], {
          shouldDirty: true,
        });
      } else {
        setValue(
          `data.${index}`,
          { type, ...updatedData },
          { shouldDirty: true },
        );
      }
    },
    [data, setValue],
  );

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
  updateSite: (
    type: WebsiteAndSocialsFieldDataType,
    data: Pick<WebsiteAndSocialsSiteData, "required">,
  ) => void;
}) {
  const enabled = !!data;

  return (
    <div className="outline-border-subtle overflow-hidden rounded-lg bg-neutral-50 outline outline-1 -outline-offset-1">
      <label
        className="border-border-subtle flex items-center justify-between gap-1.5 rounded-lg border bg-white px-3 py-2.5"
        htmlFor={`${id}-${type}`}
      >
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
              addSite(type);
            } else {
              removeSite(type);
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
        <label
          className="flex items-center justify-between gap-1.5 px-3 py-2.5"
          htmlFor={`${id}-${type}-required`}
        >
          <span className="text-sm font-medium text-neutral-800">Required</span>
          <Switch
            id={`${id}-${type}-required`}
            checked={data?.required ?? false}
            fn={(checked) => {
              updateSite(type, { required: checked });
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

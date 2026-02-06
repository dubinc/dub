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

export function WebsiteAndSocialsFieldThumbnail() {
  return (
    <svg
      width="171"
      height="100"
      viewBox="0 0 171 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full"
    >
      <path
        d="M51.3335 36.7237C56.3041 36.7237 60.3335 35.0563 60.3335 32.9995C60.3335 30.9427 56.3041 29.2754 51.3335 29.2754C46.3629 29.2754 42.3335 30.9427 42.3335 32.9995C42.3335 35.0563 46.3629 36.7237 51.3335 36.7237Z"
        stroke="#262626"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M51.3335 42C53.3903 42 55.0577 37.9706 55.0577 33C55.0577 28.0294 53.3903 24 51.3335 24C49.2767 24 47.6094 28.0294 47.6094 33C47.6094 37.9706 49.2767 42 51.3335 42Z"
        stroke="#262626"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M51.3335 42C56.3041 42 60.3335 37.9706 60.3335 33C60.3335 28.0294 56.3041 24 51.3335 24C46.3629 24 42.3335 28.0294 42.3335 33C42.3335 37.9706 46.3629 42 51.3335 42Z"
        stroke="#262626"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M78.3335 42H92.3335C93.4381 42 94.3335 41.1046 94.3335 40V26C94.3335 24.8954 93.4381 24 92.3335 24H78.3335C77.2289 24 76.3335 24.8954 76.3335 26V40C76.3335 41.1046 77.2289 42 78.3335 42Z"
        fill="#0A66C2"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M91.834 39.5H89.1629V34.9505C89.1629 33.7032 88.6889 33.0061 87.7016 33.0061C86.6276 33.0061 86.0665 33.7315 86.0665 34.9505V39.5H83.4923V30.8333H86.0665V32.0007C86.0665 32.0007 86.8405 30.5686 88.6796 30.5686C90.5179 30.5686 91.834 31.6911 91.834 34.0128V39.5ZM80.4213 29.6985C79.5445 29.6985 78.834 28.9824 78.834 28.0992C78.834 27.2161 79.5445 26.5 80.4213 26.5C81.2981 26.5 82.0082 27.2161 82.0082 28.0992C82.0082 28.9824 81.2981 29.6985 80.4213 29.6985ZM79.0921 39.5H81.7763V30.8333H79.0921V39.5Z"
        fill="white"
      />
      <g clipPath="url(#clip0_45921_492290)">
        <path
          d="M119.333 25.6217C121.737 25.6217 122.021 25.6308 122.97 25.6741C123.848 25.7141 124.324 25.8607 124.641 25.984C125.062 26.1473 125.361 26.3423 125.676 26.6572C125.991 26.9722 126.186 27.272 126.349 27.692C126.473 28.0092 126.619 28.4858 126.659 29.3632C126.703 30.3123 126.712 30.5969 126.712 33C126.712 35.4031 126.703 35.6878 126.659 36.6368C126.619 37.5143 126.473 37.9908 126.349 38.308C126.186 38.728 125.991 39.0279 125.676 39.3428C125.361 39.6577 125.062 39.8528 124.641 40.016C124.324 40.1393 123.848 40.2859 122.97 40.3259C122.021 40.3692 121.737 40.3784 119.333 40.3784C116.93 40.3784 116.646 40.3692 115.697 40.3259C114.819 40.2859 114.343 40.1393 114.026 40.016C113.605 39.8528 113.306 39.6577 112.991 39.3428C112.676 39.0278 112.481 38.728 112.318 38.308C112.194 37.9909 112.048 37.5143 112.008 36.6368C111.964 35.6878 111.955 35.4031 111.955 33C111.955 30.5969 111.964 30.3123 112.008 29.3633C112.048 28.4858 112.194 28.0092 112.318 27.692C112.481 27.272 112.676 26.9722 112.991 26.6572C113.306 26.3422 113.605 26.1473 114.026 25.984C114.343 25.8607 114.819 25.7141 115.697 25.6741C116.646 25.6308 116.93 25.6217 119.333 25.6217ZM119.333 24C116.889 24 116.583 24.0103 115.623 24.0541C114.665 24.0979 114.011 24.25 113.438 24.4725C112.846 24.7025 112.344 25.0102 111.844 25.5106C111.344 26.0109 111.036 26.5128 110.806 27.1046C110.583 27.6771 110.431 28.3314 110.388 29.2893C110.344 30.2492 110.333 30.5557 110.333 33C110.333 35.4443 110.344 35.7508 110.388 36.7107C110.431 37.6687 110.583 38.3229 110.806 38.8954C111.036 39.4872 111.344 39.9891 111.844 40.4895C112.344 40.9898 112.846 41.2975 113.438 41.5275C114.011 41.75 114.665 41.9021 115.623 41.9459C116.583 41.9897 116.889 42 119.333 42C121.778 42 122.084 41.9897 123.044 41.9459C124.002 41.9021 124.656 41.75 125.229 41.5275C125.821 41.2976 126.323 40.9898 126.823 40.4895C127.323 39.9891 127.631 39.4872 127.861 38.8954C128.083 38.3229 128.236 37.6687 128.279 36.7107C128.323 35.7508 128.333 35.4443 128.333 33C128.333 30.5557 128.323 30.2492 128.279 29.2893C128.236 28.3314 128.083 27.6771 127.861 27.1047C127.631 26.5128 127.323 26.0109 126.823 25.5106C126.323 25.0102 125.821 24.7024 125.229 24.4725C124.656 24.25 124.002 24.0979 123.044 24.0541C122.084 24.0103 121.778 24 119.333 24ZM119.333 28.3784C116.781 28.3784 114.712 30.4477 114.712 33C114.712 35.5525 116.781 37.6216 119.333 37.6216C121.886 37.6216 123.955 35.5525 123.955 33C123.955 30.4476 121.886 28.3784 119.333 28.3784ZM119.333 36C117.677 36 116.333 34.6568 116.333 33C116.333 31.3432 117.677 30 119.333 30C120.99 30 122.334 31.3432 122.334 33C122.334 34.6568 120.99 36 119.333 36ZM125.218 28.1958C125.218 28.7923 124.734 29.2758 124.138 29.2758C123.541 29.2758 123.058 28.7923 123.058 28.1958C123.058 27.5993 123.541 27.1158 124.138 27.1158C124.734 27.1158 125.218 27.5993 125.218 28.1958Z"
          fill="#171717"
        />
      </g>
      <g clipPath="url(#clip1_45921_492290)">
        <path
          d="M53.3718 65.6227L60.0682 58H58.4819L52.665 64.6173L48.0225 58H42.6665L49.6885 68.0075L42.6665 76H44.2528L50.3917 69.0104L55.2956 76H60.6515M44.8253 59.1714H47.2623L58.4808 74.8861H56.0432"
          fill="#171717"
        />
      </g>
      <g clipPath="url(#clip2_45921_492290)">
        <path
          d="M94.1694 62.5276C94.0634 62.1357 93.8565 61.7784 93.5694 61.4913C93.2823 61.2042 92.9251 60.9974 92.5332 60.8913C91.0984 60.5 85.3239 60.5 85.3239 60.5C85.3239 60.5 79.5492 60.5118 78.1144 60.9031C77.7225 61.0092 77.3652 61.2161 77.0781 61.5032C76.7911 61.7903 76.5842 62.1476 76.4782 62.5396C76.0442 65.0889 75.8758 68.9734 76.4901 71.4207C76.5961 71.8126 76.803 72.1699 77.0901 72.457C77.3772 72.7441 77.7344 72.951 78.1263 73.0571C79.5611 73.4484 85.3357 73.4484 85.3357 73.4484C85.3357 73.4484 91.1102 73.4484 92.5449 73.0571C92.9369 72.951 93.2942 72.7441 93.5812 72.457C93.8683 72.1699 94.0752 71.8126 94.1813 71.4207C94.639 68.8678 94.7801 64.9857 94.1694 62.5276Z"
          fill="#FF0000"
        />
        <path
          d="M83.4858 69.7485L88.2762 66.9739L83.4858 64.1992V69.7485Z"
          fill="white"
        />
      </g>
      <g clipPath="url(#clip3_45921_492290)">
        <path
          d="M123.524 64.4819C124.691 65.3102 126.121 65.7976 127.666 65.7976V62.8474C127.374 62.8474 127.082 62.8172 126.796 62.757V65.0792C125.252 65.0792 123.822 64.5919 122.654 63.7637V69.7841C122.654 72.7959 120.194 75.2372 117.16 75.2372C116.028 75.2372 114.976 74.8975 114.102 74.3149C115.1 75.3274 116.491 75.9555 118.03 75.9555C121.064 75.9555 123.524 73.5141 123.524 70.5023V64.4819H123.524ZM124.597 61.5055C124 60.8586 123.609 60.0225 123.524 59.0982V58.7188H122.7C122.907 59.8935 123.615 60.8972 124.597 61.5055ZM116.021 72.0038C115.688 71.5699 115.508 71.0393 115.508 70.4936C115.508 69.1162 116.633 67.9993 118.022 67.9993C118.28 67.9992 118.537 68.0386 118.784 68.1162V65.1001C118.496 65.0609 118.205 65.0442 117.914 65.0503V67.398C117.668 67.3203 117.41 67.2809 117.152 67.2811C115.764 67.2811 114.639 68.3979 114.639 69.7755C114.639 70.7496 115.201 71.5929 116.021 72.0038Z"
          fill="#FF004F"
        />
        <path
          d="M122.654 63.7636C123.821 64.5918 125.251 65.0792 126.796 65.0792V62.757C125.933 62.5747 125.17 62.1275 124.596 61.5055C123.614 60.8971 122.907 59.8935 122.699 58.7188H120.534V70.5021C120.529 71.8758 119.406 72.9881 118.021 72.9881C117.205 72.9881 116.479 72.602 116.02 72.0037C115.2 71.5929 114.638 70.7495 114.638 69.7756C114.638 68.398 115.763 67.2812 117.151 67.2812C117.417 67.2812 117.673 67.3223 117.914 67.398V65.0504C114.933 65.1115 112.536 67.529 112.536 70.5022C112.536 71.9864 113.133 73.3318 114.101 74.3149C114.976 74.8975 116.028 75.2373 117.16 75.2373C120.194 75.2373 122.654 72.7958 122.654 69.7841L122.654 63.7636Z"
          fill="black"
        />
        <path
          d="M126.796 62.7564V62.1285C126.019 62.1297 125.257 61.9136 124.597 61.5049C125.181 62.1394 125.95 62.5769 126.796 62.7564ZM122.7 58.7182C122.68 58.6059 122.665 58.4929 122.654 58.3795V58H119.665V69.7835C119.66 71.157 118.537 72.2693 117.152 72.2693C116.745 72.2693 116.361 72.1735 116.021 72.0032C116.48 72.6014 117.205 72.9875 118.021 72.9875C119.406 72.9875 120.53 71.8753 120.534 70.5016V58.7182H122.7ZM117.914 65.0498V64.3814C117.665 64.3475 117.413 64.3305 117.161 64.3306C114.126 64.3306 111.667 66.772 111.667 69.7835C111.667 71.6715 112.633 73.3355 114.102 74.3142C113.133 73.3312 112.536 71.9857 112.536 70.5016C112.536 67.5285 114.934 65.111 117.914 65.0498Z"
          fill="#00F2EA"
        />
      </g>
      <defs>
        <clipPath id="clip0_45921_492290">
          <rect
            width="18"
            height="18"
            fill="white"
            transform="translate(110.333 24)"
          />
        </clipPath>
        <clipPath id="clip1_45921_492290">
          <rect
            width="18"
            height="18"
            fill="white"
            transform="translate(42.3335 58)"
          />
        </clipPath>
        <clipPath id="clip2_45921_492290">
          <rect
            width="18.4889"
            height="13"
            fill="white"
            transform="translate(76.0889 60.5)"
          />
        </clipPath>
        <clipPath id="clip3_45921_492290">
          <rect
            width="16"
            height="18"
            fill="white"
            transform="translate(111.667 58)"
          />
        </clipPath>
      </defs>
    </svg>
  );
}

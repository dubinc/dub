import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { motion } from "framer-motion";
import TextareaAutosize from "react-textarea-autosize";
import BlurImage from "@/components/shared/blur-image";
import { LoadingCircle, UploadCloud } from "@/components/shared/icons";
import { LinkProps } from "@/lib/types";
import { AnimationSettings } from "./advanced-settings";

export default function OGSection({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  const { url, title, description, image } = data;

  const generateTitleFromUrl = async () => {
    setGeneratingTitle(true);
    fetch(`/api/edge/title?url=${url}`).then(async (res) => {
      if (res.status === 200) {
        const results = await res.json();
        setData((prev) => ({ ...prev, title: results }));
        setGeneratingTitle(false);
      }
    });
  };

  const generateDescriptionFromUrl = async () => {
    setGeneratingDescription(true);
    fetch(`/api/edge/description?url=${url}`).then(async (res) => {
      if (res.status === 200) {
        const results = await res.json();
        setData((prev) => ({ ...prev, description: results }));
        setGeneratingDescription(false);
      }
    });
  };

  const onChangePicture = useCallback(
    (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setData((prev) => ({ ...prev, image: e.target.result as string }));
      };
      reader.readAsDataURL(file);
    },
    [setData],
  );
  return (
    <motion.div key="og" className="grid gap-5" {...AnimationSettings}>
      <p className="mt-2 block px-5 text-sm text-gray-500">
        If you use custom social previews,{" "}
        <span className="font-semibold text-black">
          be sure to set all 3 sections (title, description, image)
        </span>
        , or the default OG tags of the target URL will be used.
      </p>
      <div className="border-t border-gray-200 px-5 pt-5 pb-2.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            Link Title
          </label>
          <button
            className={`${
              url.length === 0
                ? "cursor-not-allowed text-gray-300"
                : "hover:text-black active:scale-95"
            } flex items-center space-x-2 text-sm text-gray-500 transition-all duration-75`}
            onClick={() => generateTitleFromUrl()}
            disabled={url.length === 0 || generatingTitle}
            type="button"
          >
            {generatingTitle && <LoadingCircle />}
            <p>{generatingTitle ? "Generating" : "Generate from URL"}</p>
          </button>
        </div>
        <div className="mt-1 flex rounded-md shadow-sm">
          <TextareaAutosize
            name="title"
            id="title"
            minRows={3}
            className="block w-full rounded-md border-gray-300 pr-10 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
            placeholder="Dub - Open Source Bitly Alternative"
            value={title || ""}
            onChange={(e) => {
              setData({ ...data, title: e.target.value });
            }}
            aria-invalid="true"
          />
        </div>
      </div>

      <div className="border-t border-gray-200 px-5 pt-5 pb-2.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Link Description
          </label>
          <button
            className={`${
              url.length === 0
                ? "cursor-not-allowed text-gray-300"
                : "hover:text-black active:scale-95"
            } flex items-center space-x-2 text-sm text-gray-500 transition-all duration-75`}
            onClick={() => generateDescriptionFromUrl()}
            disabled={url.length === 0 || generatingDescription}
            type="button"
          >
            {generatingDescription && <LoadingCircle />}
            <p>{generatingDescription ? "Generating" : "Generate from URL"}</p>
          </button>
        </div>
        <div className="mt-1 flex rounded-md shadow-sm">
          <TextareaAutosize
            name="description"
            id="description"
            minRows={3}
            className="block w-full rounded-md border-gray-300 pr-10 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
            placeholder="Dub is an open-source link shortener SaaS with built-in analytics + free custom domains."
            value={description || ""}
            onChange={(e) => {
              setData({
                ...data,
                description:
                  e.target.value.length > 0 ? e.target.value : undefined,
              });
            }}
            aria-invalid="true"
          />
        </div>
      </div>

      <div className="border-t border-gray-200 px-5 pt-5 pb-2.5">
        <p className="block text-sm font-medium text-gray-700">Link Image</p>
        <label
          htmlFor="image"
          className="group mt-1 flex h-[10.5rem] cursor-pointer flex-col items-center justify-center rounded-md border border-gray-300 bg-white shadow-sm transition-all hover:bg-gray-50"
        >
          {image ? (
            typeof image === "string" ? (
              <BlurImage
                src={image}
                alt="Preview"
                width={1200}
                height={627}
                className="h-full w-full rounded-md object-cover transition-all hover:brightness-95"
              />
            ) : (
              <img
                src={image}
                alt="Preview"
                className="h-full w-full rounded-md object-cover transition-all hover:brightness-95"
              />
            )
          ) : (
            <>
              <UploadCloud className="h-7 w-7 text-gray-500 transition-all duration-75 group-hover:scale-110 group-active:scale-95" />
              <p className="mt-2 text-sm text-gray-500">
                Recommended: 1200 x 627 pixels
              </p>
              <span className="sr-only">OG Image upload</span>
            </>
          )}
        </label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <input
            id="image"
            name="image"
            type="file"
            className="sr-only"
            onChange={onChangePicture}
          />
        </div>
      </div>
    </motion.div>
  );
}

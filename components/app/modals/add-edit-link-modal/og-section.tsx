import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { motion } from "framer-motion";
import TextareaAutosize from "react-textarea-autosize";
import BlurImage from "@/components/shared/blur-image";
import {
  LoadingCircle,
  QuestionCircle,
  UploadCloud,
} from "@/components/shared/icons";
import { LinkProps } from "@/lib/types";
import Tooltip from "@/components/shared/tooltip";

const ANIMATION_SETTINGS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export default function OGSection({
  data,
  setData,
  generatingMetatags,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
  generatingMetatags: boolean;
}) {
  const { title, description, image } = data;

  const [fileSizeTooBig, setFileSizeTooBig] = useState(false);

  const onChangePicture = useCallback(
    (e) => {
      setFileSizeTooBig(false);
      const file = e.target.files[0];
      if (file) {
        if (file.size / 1024 / 1024 > 1) {
          setFileSizeTooBig(true);
        } else {
          const reader = new FileReader();
          reader.onload = (e) => {
            setData((prev) => ({ ...prev, image: e.target.result as string }));
          };
          reader.readAsDataURL(file);
        }
      }
    },
    [setData],
  );

  const randomIdx = Math.floor(Math.random() * 100);

  return (
    <div className="grid gap-5">
      <div className="flex items-center">
        <h2 className="text-sm font-medium text-gray-900">
          Custom Social Media Cards
        </h2>
        <Tooltip
          content={
            <div className="max-w-sm p-3">
              <p className="mt-2 block text-sm text-gray-500">
                If you use custom social previews,{" "}
                <span className="font-semibold text-black">
                  be sure to set all 3 sections (title, description, image)
                </span>
                , or the default OG tags of the target URL will be used.
              </p>
            </div>
          }
        >
          <div className="flex h-4 w-8 justify-center">
            <QuestionCircle className="h-4 w-4 text-gray-600" />
          </div>
        </Tooltip>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="block text-sm font-medium text-gray-700">Image</p>
          {fileSizeTooBig && (
            <p className="text-sm text-red-500">File size too big (max 1MB)</p>
          )}
        </div>
        <label
          htmlFor={`image-${randomIdx}`}
          className="group relative mt-1 flex h-[14rem] cursor-pointer flex-col items-center justify-center rounded-md border border-gray-300 bg-white shadow-sm transition-all hover:bg-gray-50"
        >
          {generatingMetatags && (
            <motion.div
              className="absolute flex h-full w-full items-center justify-center rounded-md bg-white"
              {...ANIMATION_SETTINGS}
            >
              <LoadingCircle />
            </motion.div>
          )}
          {image ? (
            image.startsWith("https://res.cloudinary.com") ? (
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
            id={`image-${randomIdx}`}
            name="image"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onChangePicture}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`title-${randomIdx}`}
          className="block text-sm font-medium text-gray-700"
        >
          Title
        </label>
        <div className="relative mt-1 flex rounded-md shadow-sm">
          {generatingMetatags && (
            <motion.div
              className="absolute flex h-full w-full items-center justify-center rounded-md border border-gray-300 bg-white"
              {...ANIMATION_SETTINGS}
            >
              <LoadingCircle />
            </motion.div>
          )}
          <TextareaAutosize
            name="title"
            id={`title-${randomIdx}`}
            minRows={3}
            className="block w-full rounded-md border-gray-300 pr-10 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
            placeholder="Dub - Open Source Bitly Alternative"
            value={title || ""}
            onChange={(e) => {
              setData({ ...data, title: e.target.value });
            }}
            aria-invalid="true"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`description-${randomIdx}`}
          className="block text-sm font-medium text-gray-700"
        >
          Description
        </label>
        <div className="relative mt-1 flex rounded-md shadow-sm">
          {generatingMetatags && (
            <motion.div
              className="absolute flex h-full w-full items-center justify-center rounded-md border border-gray-300 bg-white"
              {...ANIMATION_SETTINGS}
            >
              <LoadingCircle />
            </motion.div>
          )}
          <TextareaAutosize
            name="description"
            id={`description-${randomIdx}`}
            minRows={3}
            className="block w-full rounded-md border-gray-300 pr-10 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
            placeholder="Dub is open-source link management tool for modern marketing teams to create, share, and track short links."
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
    </div>
  );
}

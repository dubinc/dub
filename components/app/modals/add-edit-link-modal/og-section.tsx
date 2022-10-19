import { Dispatch, SetStateAction, useCallback, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import BlurImage from "@/components/shared/blur-image";
import { LoadingCircle, UploadCloud } from "@/components/shared/icons";
import { LinkProps } from "@/lib/types";

export default function OGSection({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const [expanded, setExpanded] = useState(false);
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
    <>
      <div>
        <div className="flex justify-between items-center">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            OG Title
          </label>
          <button
            className={`${
              url.length === 0
                ? "cursor-not-allowed text-gray-300"
                : "hover:text-black active:scale-95"
            } flex items-center space-x-2 text-gray-500 text-sm transition-all duration-75`}
            onClick={() => generateTitleFromUrl()}
            disabled={url.length === 0 || generatingTitle}
            type="button"
          >
            {generatingTitle && <LoadingCircle />}
            <p>{generatingTitle ? "Generating" : "Generate from URL"}</p>
          </button>
        </div>
        <div className="flex mt-1 rounded-md shadow-sm">
          <TextareaAutosize
            name="title"
            id="title"
            minRows={3}
            className="border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500 pr-10 block w-full rounded-md focus:outline-none sm:text-sm"
            placeholder="Dub - an open-source link shortener SaaS with built-in analytics + free custom domains."
            value={title}
            onChange={(e) => {
              setData({ ...data, title: e.target.value });
            }}
            aria-invalid="true"
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            OG Description
          </label>
          <button
            className={`${
              url.length === 0
                ? "cursor-not-allowed text-gray-300"
                : "hover:text-black active:scale-95"
            } flex items-center space-x-2 text-gray-500 text-sm transition-all duration-75`}
            onClick={() => generateDescriptionFromUrl()}
            disabled={url.length === 0 || generatingDescription}
            type="button"
          >
            {generatingDescription && <LoadingCircle />}
            <p>{generatingDescription ? "Generating" : "Generate from URL"}</p>
          </button>
        </div>
        <div className="flex mt-1 rounded-md shadow-sm">
          <TextareaAutosize
            name="description"
            id="description"
            minRows={3}
            className="border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500 pr-10 block w-full rounded-md focus:outline-none sm:text-sm"
            placeholder="Dub is an open-source link shortener SaaS with built-in analytics + free custom domains."
            value={description}
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

      <div>
        <p className="block text-sm font-medium text-gray-700">OG Image</p>
        <label
          htmlFor="image"
          className="group flex flex-col justify-center items-center mt-1 h-[10.5rem] cursor-pointer rounded-md border border-gray-300 bg-white hover:bg-gray-50 shadow-sm transition-all"
        >
          {image ? (
            typeof image === "string" ? (
              <BlurImage
                src={image}
                alt="Preview"
                width={1200}
                height={627}
                className="object-cover h-full w-full rounded-md hover:brightness-95 transition-all"
              />
            ) : (
              <img
                src={image}
                alt="Preview"
                className="object-cover h-full w-full rounded-md hover:brightness-95 transition-all"
              />
            )
          ) : (
            <>
              <UploadCloud className="h-7 w-7 text-gray-500 group-hover:scale-110 group-active:scale-95 transition-all duration-75" />
              <p className="text-gray-500 text-sm mt-2">
                Recommended: 1200 x 627 pixels
              </p>
              <span className="sr-only">OG Image upload</span>
            </>
          )}
        </label>
        <div className="flex mt-1 rounded-md shadow-sm">
          <input
            id="image"
            name="image"
            type="file"
            className="sr-only"
            onChange={onChangePicture}
          />
        </div>
      </div>
    </>
  );
}

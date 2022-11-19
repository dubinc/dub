import BlurImage from "@/components/shared/blur-image";
import { Facebook, LinkedIn, Photo, Twitter } from "@/components/shared/icons";
import { LinkProps } from "@/lib/types";
import { useMemo } from "react";

export default function Preview({
  data,
  generatingMetatags,
}: {
  data: LinkProps;
  generatingMetatags: boolean;
}) {
  const { title, description, image, url, password } = data;
  let hostname;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    hostname = url;
  }

  const { previewTitle, previewDescription, previewHostname } = useMemo(() => {
    if (password) {
      return {
        previewTitle: "Password Required",
        previewDescription:
          "This link is password protected. Please enter the password to view it.",
        previewHostname: "dub.sh",
      };
    } else {
      return {
        previewTitle: title,
        previewDescription: description,
        previewHostname: hostname,
      };
    }
  }, [password, title, description, hostname]);

  const previewImage = useMemo(() => {
    if (password) {
      return (
        <BlurImage
          src="/_static/password-protected.png"
          alt="Preview"
          width={1200}
          height={627}
          className="h-[250px] w-full border-b border-gray-300 object-cover"
        />
      );
    }
    if (image) {
      if (image.startsWith("https://res.cloudinary.com")) {
        return (
          <BlurImage
            src={image}
            alt="Preview"
            width={1200}
            height={627}
            className="h-[250px] w-full border-b border-gray-300 object-cover"
          />
        );
      } else {
        return (
          <img
            src={image}
            alt="Preview"
            className="h-[250px] w-full border-b border-gray-300 object-cover"
          />
        );
      }
    } else {
      return (
        <div className="flex h-[250px] w-full flex-col items-center justify-center space-y-4 border-b border-gray-300 bg-gray-100">
          <Photo className="h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-400">
            Enter a link to generate a preview.
          </p>
        </div>
      );
    }
  }, [image, password]);

  return (
    <div className="h-[1200px]">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-10">
        <h2 className="text-lg font-medium">Preview</h2>
        <div className="flex items-center"></div>
      </div>
      <div className="grid gap-5 p-5">
        {/* Twitter */}
        <div>
          <div className="relative mb-2">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <div className="flex items-center space-x-2 bg-white px-3">
                <Twitter className="h-4 w-4 text-[#1DA1F2]" />
                <p className="text-sm text-gray-400">Twitter</p>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-md border border-gray-300">
            {previewImage}
            <div className="grid gap-1 p-3">
              {previewHostname ? (
                <p className="text-sm text-[#536471]">{previewHostname}</p>
              ) : (
                <div className="mb-1 h-4 w-24 rounded-md bg-gray-100" />
              )}
              {previewTitle ? (
                <h3 className="truncate text-sm text-[#0f1419]">
                  {previewTitle}
                </h3>
              ) : (
                <div className="mb-1 h-4 w-full rounded-md bg-gray-100" />
              )}
              {previewDescription ? (
                <p className="text-sm text-[#536471] line-clamp-2">
                  {previewDescription}
                </p>
              ) : (
                <div className="grid gap-2">
                  <div className="h-4 w-full rounded-md bg-gray-100" />
                  <div className="h-4 w-48 rounded-md bg-gray-100" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Facebook */}
        <div>
          <div className="relative mb-2">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <div className="flex items-center space-x-2 bg-white px-3">
                <Facebook className="h-4 w-4" />
                <p className="text-sm text-gray-400">Facebook</p>
              </div>
            </div>
          </div>
          <div className="border border-gray-300">
            {previewImage}
            <div className="grid gap-1 bg-[#f2f3f5] p-3">
              {previewHostname ? (
                <p className="text-[0.8rem] uppercase text-[#606770]">
                  {previewHostname}
                </p>
              ) : (
                <div className="mb-1 h-4 w-24 rounded-md bg-gray-200" />
              )}
              {previewTitle ? (
                <h3 className="truncate font-semibold text-[#1d2129]">
                  {previewTitle}
                </h3>
              ) : (
                <div className="mb-1 h-5 w-full rounded-md bg-gray-200" />
              )}
              {previewDescription ? (
                <p className="text-sm text-[#606770] line-clamp-2">
                  {previewDescription}
                </p>
              ) : (
                <div className="grid gap-2">
                  <div className="h-4 w-full rounded-md bg-gray-200" />
                  <div className="h-4 w-48 rounded-md bg-gray-200" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LinkedIn */}
        <div>
          <div className="relative mb-2">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <div className="flex items-center space-x-2 bg-white px-3">
                <LinkedIn className="h-4 w-4" />
                <p className="text-sm text-gray-400">LinkedIn</p>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.15),0_2px_3px_rgba(0,0,0,0.2)]">
            {previewImage}
            <div className="grid gap-1 bg-white p-3">
              {previewTitle ? (
                <h3 className="truncate font-semibold text-[#000000E6]">
                  {previewTitle}
                </h3>
              ) : (
                <div className="mb-1 h-5 w-full rounded-md bg-gray-200" />
              )}
              {previewHostname ? (
                <p className="text-xs text-[#00000099]">{previewHostname}</p>
              ) : (
                <div className="mb-1 h-4 w-24 rounded-md bg-gray-200" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

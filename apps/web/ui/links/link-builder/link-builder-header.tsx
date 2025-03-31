import { FolderDropdown } from "@/ui/folders/folder-dropdown";
import { LinkLogo } from "@dub/ui";
import {
  getApexDomain,
  getUrlWithoutUTMParams,
  linkConstructor,
} from "@dub/utils";
import { ChevronRight, X } from "lucide-react";
import { PropsWithChildren, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useDebounce } from "use-debounce";
import { LinkFormData, useLinkBuilderContext } from "./link-builder-provider";

export function LinkBuilderHeader({
  onClose,
  children,
  foldersEnabled,
}: PropsWithChildren<{
  onClose?: () => void;
  foldersEnabled?: boolean;
}>) {
  const { control, setValue } = useFormContext<LinkFormData>();
  const { props } = useLinkBuilderContext();

  const [url, key, domain] = useWatch({
    control,
    name: ["url", "key", "domain"],
  });

  const [debouncedUrl] = useDebounce(getUrlWithoutUTMParams(url), 500);

  const shortLink = useMemo(
    () =>
      linkConstructor({
        key,
        domain,
        pretty: true,
      }),
    [key, domain],
  );

  return (
    <div className="flex flex-col items-start gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between">
      {foldersEnabled && (
        <div className="flex items-center gap-2">
          <FolderDropdown
            hideViewAll={true}
            disableAutoRedirect={true}
            onFolderSelect={(folder) => {
              setValue("folderId", folder.id, { shouldDirty: true });
            }}
            buttonClassName="max-w-60 md:max-w-[24rem]"
            buttonTextClassName="text-lg md:text-lg font-medium"
            {...(props?.folderId && {
              selectedFolderId: props.folderId,
            })}
          />

          <ChevronRight className="hidden size-4 text-neutral-500 md:block" />
        </div>
      )}

      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LinkLogo
            apexDomain={getApexDomain(debouncedUrl)}
            className="size-6 sm:size-6 [&>*]:size-3 sm:[&>*]:size-4"
          />
          <h3 className="!mt-0 max-w-sm truncate text-lg font-medium">
            {props ? `Edit ${shortLink}` : "New link"}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          {children}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="group hidden rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200 md:block"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

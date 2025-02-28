import useWorkspace from "@/lib/swr/use-workspace";
import { ExpandedLinkProps } from "@/lib/types";
import { Button, LinkLogo } from "@dub/ui";
import { getApexDomain, getPrettyUrl, pluralize } from "@dub/utils";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { FolderDropdown } from "./folder-dropdown";

interface MoveLinkFormProps {
  links: ExpandedLinkProps[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const MoveLinkForm = ({
  links,
  onSuccess,
  onCancel,
}: MoveLinkFormProps) => {
  const workspace = useWorkspace();
  const [isMoving, setIsMoving] = useState(false);

  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    links[0].folderId ?? "unsorted",
  );

  // Move link to selected folder
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    if (!selectedFolderId) {
      return;
    }

    e.preventDefault();
    setIsMoving(true);

    const response = await fetch(
      `/api/links/bulk?workspaceId=${workspace.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          linkIds: links.map(({ id }) => id),
          data: {
            folderId: selectedFolderId === "unsorted" ? null : selectedFolderId,
          },
        }),
      },
    );

    if (!response.ok) {
      const { error } = await response.json();
      toast.error(error.message);
      setIsMoving(false);
      return;
    }

    mutate(
      (key) => typeof key === "string" && key.startsWith("/api/links"),
      undefined,
      { revalidate: true },
    );

    toast.success("Link moved successfully!");
    onSuccess();
  };

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        {links.length === 1 && (
          <LinkLogo apexDomain={getApexDomain(links[0].url)} className="mb-4" />
        )}
        <h3 className="truncate text-lg font-medium leading-none">
          Move{" "}
          {links.length > 1
            ? `${links.length} links`
            : getPrettyUrl(links[0].shortLink)}
        </h3>
      </div>

      <div className="bg-neutral-50 sm:rounded-b-2xl">
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-y-6 px-4 text-left sm:px-6">
            <div className="mt-6">
              <label className="text-sm font-normal text-neutral-500">
                Folder
              </label>
              <div className="mt-1">
                <FolderDropdown
                  variant="input"
                  hideViewAll={true}
                  disableAutoRedirect={true}
                  onFolderSelect={(folder) => {
                    setSelectedFolderId(folder.id);
                  }}
                  buttonClassName="w-full max-w-full md:max-w-full border border-neutral-200 bg-white"
                  buttonTextClassName="text-base md:text-base font-normal"
                  selectedFolderId={selectedFolderId ?? undefined}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-8 w-fit px-3"
              onClick={onCancel}
              disabled={isMoving}
            />
            <Button
              type="submit"
              text={
                isMoving
                  ? "Moving..."
                  : `Move ${pluralize("link", links.length)}`
              }
              disabled={isMoving}
              loading={isMoving}
              className="h-8 w-fit px-3"
            />
          </div>
        </form>
      </div>
    </>
  );
};

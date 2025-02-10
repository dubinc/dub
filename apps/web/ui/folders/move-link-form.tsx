import { unsortedLinks } from "@/lib/folder/constants";
import useFolders from "@/lib/swr/use-folders";
import useWorkspace from "@/lib/swr/use-workspace";
import { ExpandedLinkProps } from "@/lib/types";
import { Button, InputSelect, InputSelectItemProps, LinkLogo } from "@dub/ui";
import {
  DICEBEAR_AVATAR_URL,
  getApexDomain,
  linkConstructor,
} from "@dub/utils";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

interface MoveLinkFormProps {
  link: ExpandedLinkProps;
  onSuccess: () => void;
  onCancel: () => void;
}

export const MoveLinkForm = ({
  link,
  onSuccess,
  onCancel,
}: MoveLinkFormProps) => {
  const { folders } = useFolders();
  const workspace = useWorkspace();
  const [isMoving, setIsMoving] = useState(false);
  const [selectedFolder, setSelectedFolder] =
    useState<InputSelectItemProps | null>(null);

  const selectOptions = useMemo(() => {
    return folders
      ? [...folders, unsortedLinks].map((folder) => ({
          id: folder.id,
          value: `${folder.name} ${folder.id === "unsorted" ? "(Unsorted)" : ""}`,
          image: workspace.logo || `${DICEBEAR_AVATAR_URL}${workspace.name}`, // TODO: Replace with folder icon
          disabled: folder.id === link.folderId,
          label: folder.id === link.folderId ? "Current" : "",
        }))
      : [];
  }, [folders, link.folderId, workspace.logo, workspace.name]);

  useEffect(() => {
    setSelectedFolder(
      selectOptions.find((option) => option.id === link.folderId) || null,
    );
  }, [selectOptions]);

  // Move link to selected folder
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    if (!selectedFolder) {
      return;
    }

    e.preventDefault();
    setIsMoving(true);

    const response = await fetch(
      `/api/links/${link.id}?workspaceId=${workspace.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          folderId: selectedFolder.id === "unsorted" ? "" : selectedFolder.id,
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

  const apexDomain = getApexDomain(link.url);

  const shortlink = useMemo(() => {
    return linkConstructor({
      key: link.key,
      domain: link.domain,
      pretty: true,
    });
  }, [link.key, link.domain]);

  const folderChanged = selectedFolder?.id !== link.folderId;

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <LinkLogo apexDomain={apexDomain} />
        <h3 className="text-lg font-medium">Move {shortlink}</h3>
        <p className="text-sm text-neutral-500">
          Select a folder below to move the link to.
        </p>
      </div>

      <div className="bg-neutral-50 sm:rounded-b-2xl">
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-y-6 px-4 text-left sm:px-6">
            <div className="mt-6">
              <label className="text-sm font-normal text-neutral-500">
                Folders
              </label>
              <div className="mt-2">
                <InputSelect
                  items={selectOptions}
                  adjustForMobile
                  selectedItem={selectedFolder}
                  setSelectedItem={setSelectedFolder}
                  className="w-full"
                  inputAttrs={{
                    placeholder: "Search...",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-9 w-fit"
              onClick={onCancel}
              disabled={isMoving}
            />
            <Button
              type="submit"
              text={isMoving ? "Moving..." : "Move link"}
              disabled={isMoving || !selectedFolder || !folderChanged}
              loading={isMoving}
              className="h-9 w-fit"
            />
          </div>
        </form>
      </div>
    </>
  );
};

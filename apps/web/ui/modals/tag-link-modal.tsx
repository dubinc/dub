import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { ExpandedLinkProps } from "@/lib/types";
import { Button, LinkLogo, Modal } from "@dub/ui";
import { getApexDomain, getPrettyUrl, pluralize } from "@dub/utils";
import {
  Dispatch,
  MouseEvent,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { TagSelect } from "./link-builder/tag-select";

interface TagLinkModalProps {
  showTagLinkModal: boolean;
  setShowTagLinkModal: Dispatch<SetStateAction<boolean>>;
  links: ExpandedLinkProps[];
}

function TagLinkModal(props: TagLinkModalProps) {
  return (
    <Modal
      showModal={props.showTagLinkModal}
      setShowModal={props.setShowTagLinkModal}
    >
      <TagLinkModalInner {...props} />
    </Modal>
  );
}

function TagLinkModalInner({ setShowTagLinkModal, links }: TagLinkModalProps) {
  const { id: workspaceId } = useWorkspace();

  const [updating, setUpdating] = useState(false);

  // Create form context needed for TagSelect
  const form = useForm({
    defaultValues: {
      tags:
        links.length === 1 ||
        links
          .slice(1)
          .every(
            ({ tags }) =>
              JSON.stringify(tags) === JSON.stringify(links[0].tags),
          )
          ? links[0].tags
          : [],
      id: links[0]?.id,
      url: links[0]?.url,
      title: links[0]?.title,
      description: links[0]?.description,
    },
  });

  const handleSubmit = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setUpdating(true);

    const tags = form.getValues("tags");

    const response = await fetch(`/api/links/bulk?workspaceId=${workspaceId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        linkIds: links.map(({ id }) => id),
        data: { tagIds: tags.map((t) => t.id) },
      }),
    });

    if (!response.ok) {
      const { error } = await response.json();
      toast.error(error.message);
      setUpdating(false);
      return;
    }

    mutatePrefix("/api/links");
    setShowTagLinkModal(false);
    toast.success(
      `Successfully updated tags for ${pluralize("link", links.length)}!`,
    );
    setUpdating(false);
  };

  return (
    <FormProvider {...form}>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        {links.length === 1 && (
          <LinkLogo apexDomain={getApexDomain(links[0].url)} className="mb-4" />
        )}
        <h3 className="truncate text-lg font-medium leading-none">
          Update tags for{" "}
          {links.length > 1
            ? `${links.length} links`
            : getPrettyUrl(links[0].shortLink)}
        </h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <TagSelect />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          onClick={() => setShowTagLinkModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={handleSubmit}
          loading={updating}
          text={updating ? "Saving..." : "Update tags"}
          className="h-8 w-fit px-3"
        />
      </div>
    </FormProvider>
  );
}

export function useTagLinkModal({
  props,
}: {
  props: ExpandedLinkProps | ExpandedLinkProps[];
}) {
  const [showTagLinkModal, setShowTagLinkModal] = useState(false);

  const TagLinkModalCallback = useCallback(() => {
    return props ? (
      <TagLinkModal
        showTagLinkModal={showTagLinkModal}
        setShowTagLinkModal={setShowTagLinkModal}
        links={Array.isArray(props) ? props : [props]}
      />
    ) : null;
  }, [showTagLinkModal, setShowTagLinkModal, props]);

  return useMemo(
    () => ({
      setShowTagLinkModal,
      TagLinkModal: TagLinkModalCallback,
    }),
    [setShowTagLinkModal, TagLinkModalCallback],
  );
}

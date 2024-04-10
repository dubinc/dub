import useTags from "@/lib/swr/use-tags";
import { InputSelect, useRouterStuff } from "@dub/ui";
import { Tag } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useContext } from "react";
import { ModalContext } from "../modals/provider";

export default function TagSelector() {
  const { queryParams } = useRouterStuff();

  const { tags } = useTags();
  const searchParams = useSearchParams();
  const selectedTagId = searchParams?.get("tagId");
  const { setShowAddEditTagModal } = useContext(ModalContext);

  return (
    <InputSelect
      adjustForMobile
      disabled={!tags}
      items={
        tags?.map(({ id, name, color }) => ({
          id,
          color,
          value: name,
        })) || []
      }
      icon={<Tag className="h-4 w-4 text-black" />}
      selectedItem={{
        id: selectedTagId!,
        value: tags?.find(({ id }) => id === selectedTagId)?.name || "",
        color: tags?.find(({ id }) => id === selectedTagId)?.color,
      }}
      setSelectedItem={(tag) => {
        if (tag && typeof tag !== "function" && tag.id) {
          queryParams({
            set: { tagId: tag.id },
          });
        } else {
          queryParams({ del: "tagId" });
        }
      }}
      inputAttrs={{
        placeholder: "Filter tags",
      }}
      className="lg:w-48"
      noItemsElement={
        <div>
          <h4 className="mb-2 px-2 py-2 text-sm text-gray-600">
            No tags found in this workspace
          </h4>
          <button
            type="button"
            className="w-full rounded-md border border-black bg-black px-3 py-1.5 text-center text-sm text-white transition-all hover:bg-white hover:text-black"
            onClick={() => setShowAddEditTagModal(true)}
          >
            Add a tag
          </button>
        </div>
      }
    />
  );
}

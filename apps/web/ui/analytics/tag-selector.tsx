import useTags from "@/lib/swr/use-tags";
import { InputSelect, useRouterStuff } from "@dub/ui";
import { Tag } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function TagSelector() {
  const router = useRouter();
  const { queryParams } = useRouterStuff();

  const { tags } = useTags();
  const searchParams = useSearchParams();
  const selectedTagId = searchParams?.get("tagId");

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
        if (tag && typeof tag !== "function" && tag.id)
          router.push(
            queryParams({
              set: { tagId: tag.id },
              getNewPath: true,
            }) as string,
          );
        else
          router.push(
            queryParams({ del: "tagId", getNewPath: true }) as string,
          );
      }}
      inputAttrs={{
        placeholder: "Filter tags",
      }}
      className="lg:w-48"
    />
  );
}

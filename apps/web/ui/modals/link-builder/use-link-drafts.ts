import { useLocalStorage } from "@dub/ui";
import { subDays } from "date-fns";
import { useCallback, useLayoutEffect, useMemo } from "react";
import { LinkFormData } from ".";

export type LinkDraft = {
  timestamp: number;
  id: string;
  link: Partial<LinkFormData>;
};

export function useLinkDrafts({ linkId }: { linkId?: string } = {}) {
  const [drafts, setDrafts] = useLocalStorage<LinkDraft[]>("link-drafts", []);

  // Removes drafts older than 1 week, limiting to 10 drafts
  const removeOldDrafts = useCallback(() => {
    setDrafts(
      drafts
        .filter((draft) => draft.timestamp > subDays(new Date(), 7).getTime())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10),
    );
  }, [drafts]);

  // Initialize / clean up drafts
  useLayoutEffect(() => {
    if (!Array.isArray(drafts)) setDrafts([]);
    else removeOldDrafts();
  }, []);

  const saveDraft = (id: string, link: Partial<LinkFormData>) => {
    setDrafts([
      ...drafts.filter((d) => d.id !== id),
      { id, link, timestamp: new Date().getTime() },
    ]);
  };

  const removeDraft = (id: string) => {
    setDrafts(drafts.filter((draft) => draft.id !== id));
  };

  const filteredDrafts = useMemo(() => {
    console.log(linkId, drafts);
    return linkId
      ? drafts.filter((draft) => draft.link.id === linkId)
      : drafts.filter((draft) => !draft.link.id);
  }, [drafts, linkId]);

  return { drafts: filteredDrafts, saveDraft, removeDraft };
}

import LinkFilters from "@/ui/links/link-filters";
import { Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronDown, Filter } from "lucide-react";
import {
  Dispatch,
  SetStateAction,
  Suspense,
  useCallback,
  useMemo,
  useState,
} from "react";

function LinkFiltersModal({
  showLinkFiltersModal,
  setShowLinkFiltersModal,
}: {
  showLinkFiltersModal: boolean;
  setShowLinkFiltersModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <Modal
      showModal={showLinkFiltersModal}
      setShowModal={setShowLinkFiltersModal}
    >
      <Suspense>
        <LinkFilters />
      </Suspense>
    </Modal>
  );
}

function LinkFiltersButton({
  setShowLinkFiltersModal,
  showLinkFiltersModal,
}: {
  setShowLinkFiltersModal: Dispatch<SetStateAction<boolean>>;
  showLinkFiltersModal: boolean;
}) {
  return (
    <button
      onClick={() => setShowLinkFiltersModal(true)}
      className={cn(
        "group mr-2 flex h-10 w-full cursor-pointer appearance-none items-center gap-x-2 truncate rounded-md border px-3 text-sm outline-none transition-all",
        "border-gray-200 bg-white text-gray-900 placeholder-gray-400 lg:hidden",
      )}
    >
      <Filter className="h-4 w-4 shrink-0" />
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-gray-900">
        Filters
      </span>
      <ChevronDown
        className={cn(
          "h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-75",
          showLinkFiltersModal && "rotate-180",
        )}
      />
    </button>
  );
}

export function useLinkFiltersModal() {
  const [showLinkFiltersModal, setShowLinkFiltersModal] = useState(false);

  const LinkFiltersModalCallback = useCallback(() => {
    return (
      <LinkFiltersModal
        showLinkFiltersModal={showLinkFiltersModal}
        setShowLinkFiltersModal={setShowLinkFiltersModal}
      />
    );
  }, [showLinkFiltersModal, setShowLinkFiltersModal]);

  const LinkFiltersButtonCallback = useCallback(() => {
    return (
      <LinkFiltersButton
        showLinkFiltersModal={showLinkFiltersModal}
        setShowLinkFiltersModal={setShowLinkFiltersModal}
      />
    );
  }, [setShowLinkFiltersModal]);

  return useMemo(
    () => ({
      setShowLinkFiltersModal,
      LinkFiltersModal: LinkFiltersModalCallback,
      LinkFiltersButton: LinkFiltersButtonCallback,
    }),
    [setShowLinkFiltersModal, LinkFiltersModalCallback],
  );
}

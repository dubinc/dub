import LinkFilters from "@/ui/links/link-filters";
import { IconMenu, Modal } from "@dub/ui";
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
      className="mr-5 flex flex-1 items-center justify-between space-x-2 rounded-md bg-white px-3 py-2.5 shadow transition-all duration-75 hover:shadow-md active:scale-95 lg:hidden"
    >
      <IconMenu text="Filters" icon={<Filter className="h-4 w-4 shrink-0" />} />
      <ChevronDown
        className={`h-5 w-5 text-gray-400 ${
          showLinkFiltersModal ? "rotate-180 transform" : ""
        } transition-all duration-75`}
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

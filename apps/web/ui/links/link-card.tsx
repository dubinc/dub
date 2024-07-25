import { CardList } from "@dub/ui";
import { useAddEditLinkModal } from "../modals/add-edit-link-modal";
import { LinkDetailsColumn } from "./link-details-column";
import { LinkTitleColumn } from "./link-title-column";
import { ResponseLink } from "./links-container";

export function LinkCard({ link }: { link: ResponseLink }) {
  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal({
    props: link,
  });

  return (
    <>
      <AddEditLinkModal />
      <CardList.Card
        key={link.id}
        onClick={() => setShowAddEditLinkModal(true)}
        innerClassName="flex items-center gap-5 sm:gap-8 md:gap-12 text-sm"
      >
        <div className="min-w-0 grow">
          <LinkTitleColumn link={link} />
        </div>
        <LinkDetailsColumn link={link} />
      </CardList.Card>
    </>
  );
}

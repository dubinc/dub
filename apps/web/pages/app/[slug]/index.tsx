import LinksContainer from "@/components/app/links/links-container";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import AppLayout from "components/layout/app";
import { useRouter } from "next/router";
import useProject from "#/lib/swr/use-project";
import { useState } from "react";
import Popover from "#/ui/popover";
import { ChevronDown, FilePlus2, Sheet } from "lucide-react";
import IconMenu from "@/components/shared/icon-menu";
import Tooltip from "#/ui/tooltip";

export default function ProjectLinks() {
  const { slug } = useProject();

  const { AddEditLinkModal, AddEditLinkButton } = useAddEditLinkModal();

  return (
    <AppLayout>
      {slug && <AddEditLinkModal />}
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-gray-600">Links</h1>
            <div className="flex">
              <AddEditLinkButton />
              <AddLinkOptions />
            </div>
          </div>
        </MaxWidthWrapper>
      </div>
      {slug && <LinksContainer AddEditLinkButton={AddEditLinkButton} />}
    </AppLayout>
  );
}

const AddLinkOptions = () => {
  const router = useRouter();
  const { slug } = useProject();
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <Popover
      content={
        <div className="w-full divide-y divide-gray-200 md:w-52">
          <div className="p-2">
            <button
              onClick={() => {
                setOpenPopover(false);
                router.push({
                  pathname: `/${slug}`,
                  query: {
                    import: "bitly",
                  },
                });
              }}
              className="w-full rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
            >
              <IconMenu
                text="Import from Bitly"
                icon={
                  <img
                    src="/_static/icons/bitly.svg"
                    alt="Bitly logo"
                    className="h-4 w-4 rounded-full grayscale"
                  />
                }
              />
            </button>
            <button
              onClick={() => {
                setOpenPopover(false);
                router.push({
                  pathname: `/${slug}`,
                  query: {
                    import: "short",
                  },
                });
              }}
              className="w-full rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
            >
              <IconMenu
                text="Import from Short.io"
                icon={
                  <img
                    src="/_static/icons/short.svg"
                    alt="Short.io logo"
                    className="h-4 w-4 grayscale"
                  />
                }
              />
            </button>
            <Tooltip content="This feature is still in development – we'll let you know when it's ready!">
              <div className="flex w-full cursor-not-allowed items-center justify-between space-x-2 rounded-md p-2 text-sm text-gray-400">
                <IconMenu
                  text="Import from CSV"
                  icon={<Sheet className="h-4 w-4" />}
                />
              </div>
            </Tooltip>
          </div>
          <div className="p-2">
            <Tooltip content="This feature is still in development – we'll let you know when it's ready!">
              <div className="flex w-full cursor-not-allowed items-center justify-between space-x-2 rounded-md p-2 text-sm text-gray-400">
                <IconMenu
                  text="Bulk create links"
                  icon={<FilePlus2 className="h-4 w-4" />}
                />
              </div>
            </Tooltip>
          </div>
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      align="end"
    >
      <button
        onClick={() => setOpenPopover(!openPopover)}
        className="group ml-2 flex items-center justify-between space-x-2 rounded-md border border-gray-200 bg-white p-2.5 shadow transition-all duration-75 active:scale-95"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 ${
            openPopover ? "rotate-180 text-gray-700" : "text-gray-400"
          } transition-all group-hover:text-gray-700`}
        />
      </button>
    </Popover>
  );
};

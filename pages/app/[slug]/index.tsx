import LinksContainer from "@/components/app/links/links-container";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import AppLayout from "components/layout/app";
import useProject from "#/lib/swr/use-project";
import { useState } from "react";
import Popover from "#/ui/popover";
import IconMenu from "@/components/shared/icon-menu";
import { ChevronDown, FilePlus2, Import } from "lucide-react";
import { useRouter } from "next/router";

export default function ProjectLinks() {
  const router = useRouter();
  const { slug } = useProject();

  const { AddEditLinkModal, AddEditLinkButton } = useAddEditLinkModal();

  const [openPopover, setOpenPopover] = useState(false);

  return (
    <AppLayout>
      {slug && <AddEditLinkModal />}
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-gray-600">Links</h1>
            <div className="flex space-x-2">
              <AddEditLinkButton />
              {/* <Popover
                content={
                  <div className="w-full p-2 md:w-52">
                    <button
                      onClick={() => {}}
                      className="flex w-full items-center justify-between space-x-2 rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
                    >
                      <IconMenu
                        text="Bulk create links"
                        icon={<FilePlus2 className="h-4 w-4" />}
                      />
                    </button>
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
                      className="flex w-full items-center justify-between space-x-2 rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
                    >
                      <IconMenu
                        text="Import from Bitly"
                        icon={<Import className="h-4 w-4" />}
                      />
                    </button>
                  </div>
                }
                openPopover={openPopover}
                setOpenPopover={setOpenPopover}
                align="end"
              >
                <button
                  onClick={() => setOpenPopover(!openPopover)}
                  className="group flex items-center justify-between space-x-2 rounded-md border border-gray-200 bg-white p-2.5 shadow transition-all duration-75 active:scale-95"
                >
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 ${
                      openPopover ? "rotate-180 text-gray-700" : "text-gray-400"
                    } transition-all group-hover:text-gray-700`}
                  />
                </button>
              </Popover> */}
            </div>
          </div>
        </MaxWidthWrapper>
      </div>
      {slug && <LinksContainer AddEditLinkButton={AddEditLinkButton} />}
    </AppLayout>
  );
}

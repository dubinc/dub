import { OAuthAuthorizedAppProps } from "@/lib/types";
import { useDeleteAppModal } from "@/ui/modals/delete-oauth-app-modal";
import { Delete, ThreeDots } from "@/ui/shared/icons";
import { BlurImage, Button, Popover, TokenAvatar } from "@dub/ui";
import { useState } from "react";

export default function IntegrationCard(app: OAuthAuthorizedAppProps) {
  const [openPopover, setOpenPopover] = useState(false);

  const { DeleteAppModal, setShowDeleteAppModal } = useDeleteAppModal({
    app: {
      clientId: app.clientId,
      name: app.name,
    },
    appType: "authorized",
  });

  return (
    <>
      <DeleteAppModal />
      <div className="relative rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center space-x-3">
          {app.logo ? (
            <BlurImage
              src={app.logo}
              alt={`Logo for ${app.name}`}
              className="h-10 w-10 rounded-full border border-gray-200"
              width={20}
              height={20}
            />
          ) : (
            <TokenAvatar id={app.clientId} />
          )}
          <div className="flex flex-col space-y-px">
            <p className="font-semibold text-gray-700">{app.name}</p>
            <p className="text-sm text-gray-500">Installed</p>
          </div>
        </div>
        <Popover
          content={
            <div className="w-full sm:w-48">
              <div className="grid gap-px p-2">
                <Button
                  text="Disconnect"
                  variant="danger-outline"
                  icon={<Delete className="h-4 w-4" />}
                  className="h-9 justify-start px-2 font-medium"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowDeleteAppModal(true);
                  }}
                />
              </div>
            </div>
          }
          align="end"
          openPopover={openPopover}
          setOpenPopover={setOpenPopover}
        >
          <button
            onClick={() => {
              setOpenPopover(!openPopover);
            }}
            className="absolute right-4 rounded-md px-1 py-2 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
          >
            <ThreeDots className="h-5 w-5 text-gray-500" />
          </button>
        </Popover>
      </div>
    </>
  );
}

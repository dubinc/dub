import { ThreeDots } from "@/ui/shared/icons";
import { Button, LoadingSpinner, Popover } from "@dub/ui";
import { Delete } from "lucide-react";
import { useState } from "react";

function HostnameMenu({
  onDelete,
  loading,
}: {
  onDelete: () => void;
  loading: boolean;
  permissionsError?: string;
}) {
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <Popover
      content={
        <div className="w-full sm:w-48">
          <div className="grid gap-px p-2">
            <Button
              text="Delete"
              variant="danger-outline"
              onClick={() => {
                setOpenPopover(false);
                onDelete();
              }}
              icon={<Delete className="h-4 w-4" />}
              className="h-9 justify-start px-2 font-medium"
            />
          </div>
        </div>
      }
      align="end"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <Button
        variant="plain"
        color="secondary"
        className="h-9 border-none p-2"
        icon={
          loading ? (
            <LoadingSpinner className="size-4 shrink-0" />
          ) : (
            <ThreeDots className="h-5 w-5 shrink-0 rotate-90" />
          )
        }
        onClick={() => {
          setOpenPopover(!openPopover);
        }}
      />
    </Popover>
  );
}

export default HostnameMenu;

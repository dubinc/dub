import { ThreeDots } from "@/ui/shared/icons";
import { Button, Popover } from "@dub/ui";
import { Delete } from "lucide-react";
import { useState } from "react";

function PublishableKeyMenu({
  onRevoke,
  loading,
}: {
  onRevoke: () => void;
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
              text="Revoke"
              variant="danger-outline"
              onClick={() => {
                setOpenPopover(false);
                onRevoke();
              }}
              icon={<Delete className="h-4 w-4" />}
              className="h-9 justify-start px-2 font-medium"
              loading={loading}
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
        icon={<ThreeDots className="h-5 w-5 shrink-0 rotate-90" />}
        onClick={() => {
          setOpenPopover(!openPopover);
        }}
      />
    </Popover>
  );
}

export default PublishableKeyMenu;

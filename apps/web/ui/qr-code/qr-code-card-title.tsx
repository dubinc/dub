import { Input, Tooltip } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { Icon } from "@iconify/react";
import { Button, Flex } from "@radix-ui/themes";
import { useState } from "react";

export function QRCardTitle({ value }: { value: string }) {
  const [isEdit, setIsEdit] = useState(false);

  const onEditClick = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    setIsEdit(true);
  };

  const handleSave = (newValue: string) => {
    setIsEdit(false);

    if (newValue === value) return;

    // request to change title
    return;
  };

  return (
    <Flex direction="row" gap="2" align="center" className="h-[26px] min-w-0">
      {isEdit ? (
        <QrCodeRename initialName={value} onSave={handleSave} />
      ) : (
        <>
          <span className="min-w-0 truncate font-bold text-neutral-500 xl:font-medium">
            My Lovely QR
          </span>
          <Tooltip content="Rename" delayDuration={150}>
            <div className="shrink-0 p-1">
              <Icon
                icon="uil:edit"
                className="cursor-pointer text-neutral-500"
                onClick={onEditClick}
              />
            </div>
          </Tooltip>
        </>
      )}
    </Flex>
  );
}

function QrCodeRename({
  initialName,
  onSave,
}: {
  initialName: string;
  onSave: (newName: string) => void;
}) {
  const [name, setName] = useState(initialName);

  return (
    <div className="ml-0.5 flex items-center gap-1">
      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={cn(
          "text-md max-w-[120px] rounded-md border px-1 py-0.5",
          "data-[hover-state-enabled=true]:hover:drop-shadow-card-hover border-border-200 border transition-[filter]",
        )}
        autoFocus
      />
      <Button
        variant="solid"
        size="1"
        className="!bg-secondary !rounded-md !px-1"
        onClick={() => onSave(name)}
      >
        <Icon icon="uil:save" className="cursor-pointer text-xl text-white" />
      </Button>
    </div>
  );
}

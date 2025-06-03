import { Input, Tooltip } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { Icon } from "@iconify/react";
import { Button, Flex } from "@radix-ui/themes";
import { useState } from "react";
import { useQrSave } from "./hooks/use-qr-save";
import { ResponseQrCode } from "./qr-codes-container";

export function QRCardTitle({ qrCode }: { qrCode: ResponseQrCode }) {
  const [isEdit, setIsEdit] = useState(false);
  const { updateQr } = useQrSave();

  const onEditClick = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    setIsEdit(true);
  };

  const handleSave = async (newValue: string) => {
    setIsEdit(false);

    if (newValue === (qrCode.title || "")) return;

    await updateQr(qrCode.id, {
      title: newValue,
      data: qrCode.data, // передаем существующий URL
    });
  };

  const displayValue = qrCode.title || "Untitled QR";

  return (
    <Flex direction="row" gap="1" align="center" className="h-[26px] min-w-0">
      {isEdit ? (
        <QrCodeRename initialName={displayValue} onSave={handleSave} />
      ) : (
        <>
          <span className="text-neutral min-w-0 truncate font-bold lg:font-medium lg:text-neutral-500">
            {displayValue}
          </span>
          <Tooltip content="Rename" delayDuration={150}>
            <div className="shrink-0 p-1">
              <Icon
                icon="uil:edit"
                className="text-secondary cursor-pointer"
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

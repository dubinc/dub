import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import * as Label from "@radix-ui/react-label";
import { useState } from "react";

interface QrCodeRenameProps {
  initialName: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
}

export function QrCodeRename({ initialName, onSave, onCancel }: QrCodeRenameProps) {
  const [name, setName] = useState(initialName);

  return (
    <div className="flex items-center gap-2">
      <Label.Root className="flex-1">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(
            "w-full rounded-md border border-neutral-200 px-3 py-1 text-sm",
            "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
          )}
          autoFocus
        />
      </Label.Root>
      <Button
        variant="solid"
        color="blue"
        size="sm"
        onClick={() => onSave(name)}
      >
        Save
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
      >
        Cancel
      </Button>
    </div>
  );
} 
import { useEffect } from "react";
import { toast } from "sonner";
import Success from "../icons/success";

function ToastWithUndo({
  id,
  message,
  undo,
}: {
  id: number | string;
  message: string;
  undo: () => void;
}) {
  const undoAndDismiss = () => {
    undo();
    toast.dismiss(id);
  };

  const handleKeyboardEvent = (event: KeyboardEvent) => {
    if (event.key === "z" && (event.ctrlKey || event.metaKey)) {
      undoAndDismiss();
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyboardEvent);
    return () => document.removeEventListener("keydown", handleKeyboardEvent);
  }, []);

  return (
    <div className="flex w-full items-center justify-between space-x-2">
      <div className="flex items-center space-x-2">
        <Success />
        <p className="font-medium">{message}</p>
      </div>
      <button
        className="whitespace-nowrap rounded border border-black bg-black px-2 py-1 text-xs font-normal text-white transition-all duration-75 active:scale-95"
        onClick={undoAndDismiss}
      >
        Undo
      </button>
    </div>
  );
}

export function useToastWithUndo() {
  const toastWithUndo = ({
    id,
    message,
    undo,
    duration,
  }: {
    id: number | string;
    message: string;
    undo: () => void;
    duration?: number;
  }) => {
    return toast(<ToastWithUndo id={id} message={message} undo={undo} />, {
      id,
      ...(duration && { duration }),
    });
  };

  return toastWithUndo;
}

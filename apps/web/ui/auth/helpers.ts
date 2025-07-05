import { MessageType } from "@/ui/modals/auth-modal.tsx";
import { toast } from "sonner";

export const showMessage = (
  message: string | undefined,
  type: "success" | "error",
  authModal?: boolean,
  setAuthModalMessage?: (message: string | null, type: MessageType) => void,
) => {
  const messageText =
    message ||
    (type === "error" ? "An error occurred" : "Operation successful");

  if (authModal && setAuthModalMessage) {
    setAuthModalMessage(messageText, type);
  } else {
    if (type === "success") {
      toast.success(messageText);
    } else {
      toast.error(messageText);
    }
  }
};

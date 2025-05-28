import { toast } from "sonner";
import { MessageType } from "../../app/app.dub.co/(auth)/auth.modal";

/**
 * Helper function to show messages consistently across the auth flow
 * Will use modal message if in modal context, otherwise falls back to toast
 */
export const showMessage = (
  message: string | undefined, 
  type: "success" | "error", 
  authModal?: boolean, 
  setAuthModalMessage?: (message: string | null, type: MessageType) => void
) => {
  const messageText = message || (type === "error" ? "An error occurred" : "Operation successful");
  
  console.log("[showMessage] here");
  console.log("[showMessage] authModal", authModal);
  console.log("[showMessage] setAuthModalMessage", setAuthModalMessage);
  console.log("[showMessage] message", messageText);
  
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
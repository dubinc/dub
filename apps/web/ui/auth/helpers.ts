import { toast } from "sonner";

export const showMessage = (
  message: string | React.ReactNode,
  type: "success" | "error",
) => {
  const messageText =
    message ||
    (type === "error" ? "An error occurred" : "Operation successful");

  if (type === "success") {
    toast.success(messageText, { duration: 10000 });
  } else {
    toast.error(messageText, { duration: 10000 });
  }
};

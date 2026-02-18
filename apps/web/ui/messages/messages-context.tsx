import { Dispatch, SetStateAction, createContext, useContext } from "react";

export type MessagesPanel = "index" | "main";

export const MessagesContext = createContext<{
  currentPanel: MessagesPanel;
  setCurrentPanel: Dispatch<SetStateAction<MessagesPanel>>;
  targetThreadId: string | null;
  setTargetThreadId: Dispatch<SetStateAction<string | null>>;
}>({
  currentPanel: "index",
  setCurrentPanel: () => {},
  targetThreadId: null,
  setTargetThreadId: () => {},
});

export function useMessagesContext() {
  return useContext(MessagesContext);
}

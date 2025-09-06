import { Dispatch, SetStateAction, createContext, useContext } from "react";

export type MessagesPanel = "index" | "main";

export const MessagesContext = createContext<{
  currentPanel: MessagesPanel;
  setCurrentPanel: Dispatch<SetStateAction<MessagesPanel>>;
}>({
  currentPanel: "index",
  setCurrentPanel: () => {},
});

export function useMessagesContext() {
  return useContext(MessagesContext);
}

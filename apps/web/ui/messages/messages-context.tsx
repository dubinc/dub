import { Dispatch, SetStateAction, createContext, useContext } from "react";

export type MessagesPanel = "index" | "main";

export const MessagesContext = createContext<{
  currentPanel: MessagesPanel;
  setCurrentPanel: Dispatch<SetStateAction<MessagesPanel>>;
  /** Thread the user just opened. Covers the pane until its messages are ready. */
  openingThreadId: string | null;
  setOpeningThreadId: Dispatch<SetStateAction<string | null>>;
  /** Thread whose messages are currently safe to show. */
  loadedThreadId: string | null;
  setLoadedThreadId: Dispatch<SetStateAction<string | null>>;
}>({
  currentPanel: "index",
  setCurrentPanel: () => {},
  openingThreadId: null,
  setOpeningThreadId: () => {},
  loadedThreadId: null,
  setLoadedThreadId: () => {},
});

export function useMessagesContext() {
  return useContext(MessagesContext);
}

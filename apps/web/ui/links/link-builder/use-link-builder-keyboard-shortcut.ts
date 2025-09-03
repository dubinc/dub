import { useKeyboardShortcut } from "@dub/ui";
import { useLinkBuilderContext } from "./link-builder-provider";

export const useLinkBuilderKeyboardShortcut: typeof useKeyboardShortcut = (
  ...args
) => {
  const { modal } = useLinkBuilderContext();

  useKeyboardShortcut(args[0], args[1], {
    modal,
    ...args[2],
  });
};

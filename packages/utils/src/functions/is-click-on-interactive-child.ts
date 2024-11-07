import { MouseEvent } from "react";

export function isClickOnInteractiveChild(e: MouseEvent) {
  // Traverse up the DOM tree to see if there's a clickable element between this card and the click
  for (
    let target = e.target as HTMLElement, i = 0;
    target && target !== e.currentTarget && i < 50; // Only go 50 levels deep
    target = target.parentElement as HTMLElement, i++
  ) {
    // Don't trigger onClick if a clickable element inside the card was clicked
    if (
      ["button", "a", "input", "textarea"].includes(
        target.tagName.toLowerCase(),
      ) ||
      [
        "data-radix-popper-content-wrapper",
        "data-vaul-overlay",
        "data-vaul-drawer",
      ].some((attr) => target.getAttribute(attr) !== null)
    )
      return true;
  }

  return false;
}

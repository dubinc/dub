import { computePosition, offset, Placement, shift } from "@floating-ui/dom";
import { DUB_CONTAINER_ID } from "./constants";
import { DubOptions } from "./types";

export function setAnchoredPosition({
  anchorId,
  placement,
}: Pick<DubOptions, "anchorId" | "placement">) {
  if (!anchorId) return;

  const anchor = document.getElementById(anchorId);
  if (!anchor) {
    console.error(`[Dub] No anchor found with id: ${anchorId}`);
    return;
  }

  const container = document.getElementById(DUB_CONTAINER_ID);
  if (!container) {
    console.error(`[Dub] No container found with id: ${DUB_CONTAINER_ID}`);
    return;
  }

  computePosition(anchor, container, {
    placement: {
      "top-left": "bottom-start",
      center: "bottom-start",
      "bottom-left": "top-start",
      "top-right": "bottom-end",
      "bottom-right": "top-end",
    }[placement ?? "bottom-right"] as Placement,
    middleware: [shift(), offset(16)],
  }).then(({ x, y }) => {
    Object.assign(container.style, {
      top: `${y}px`,
      left: `${x}px`,
      right: "auto",
      bottom: "auto",
    });
  });
}

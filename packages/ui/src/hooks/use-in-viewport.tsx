"use client";

import { RefObject, useEffect, useState } from "react";

export function useInViewport(
  elementRef: RefObject<Element>,
  options: { root?: RefObject<Element>; defaultValue?: boolean } = {},
) {
  const { root, defaultValue } = options;
  const [visible, setVisible] = useState(defaultValue ?? false);

  useEffect(() => {
    const checkVisibility = () => {
      const node = elementRef.current;
      if (!node) return;
      const rootNode = root?.current;

      const rect = node.getBoundingClientRect();
      const rootRect = rootNode
        ? rootNode.getBoundingClientRect()
        : {
            top: 0,
            left: 0,
            bottom: window.innerHeight,
            right: window.innerWidth,
          };

      setVisible(
        rect.top < rootRect.bottom &&
          rect.bottom > rootRect.top &&
          rect.left < rootRect.right &&
          rect.right > rootRect.left,
      );
    };

    (root?.current || window).addEventListener("scroll", checkVisibility);
    window.addEventListener("resize", checkVisibility);

    checkVisibility();

    return () => {
      (root?.current || window).removeEventListener("scroll", checkVisibility);
      window.removeEventListener("resize", checkVisibility);
    };
  }, [elementRef, root]);

  return visible;
}

"use client";

import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";

export function ZoomImage(
  props: React.DetailedHTMLProps<
    React.ImgHTMLAttributes<HTMLImageElement>,
    HTMLImageElement
  >,
) {
  return (
    <Zoom
      zoomMargin={45}
      zoomImg={{ ...props, className: "rounded-lg border border-gray-200" }}
    >
      <img {...props} className="rounded-lg border border-gray-200" />
    </Zoom>
  );
}

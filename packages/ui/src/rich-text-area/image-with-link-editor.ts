"use client";

import type { ImageOptions } from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageAltNodeView } from "./image-alt-node-view";
import {
  ImageWithLink,
  type ConfigureImageWithLinkOptions,
} from "./image-with-link";

const ImageWithLinkEditorExtension = ImageWithLink.extend({
  addNodeView() {
    const { renderLink, imageAltControls } = this
      .options as ConfigureImageWithLinkOptions;

    if (renderLink || !imageAltControls) {
      return null;
    }

    return ReactNodeViewRenderer(ImageAltNodeView);
  },
});

export function configureImageWithLinkEditor(
  options: ConfigureImageWithLinkOptions,
) {
  return ImageWithLinkEditorExtension.configure(
    options as Partial<ImageOptions>,
  );
}

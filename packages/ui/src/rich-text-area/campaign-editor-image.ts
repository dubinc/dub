"use client";

import { isSafeLinkHref } from "@dub/utils";
import Image, { type ImageOptions } from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageAltNodeView } from "./image-alt-node-view";

export type ConfigureCampaignEditorImageOptions = Partial<ImageOptions> & {
  imageAltControls?: boolean;
};

const CampaignEditorImageExtension = Image.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      imageAltControls: false,
    } as ImageOptions;
  },

  addNodeView() {
    const { imageAltControls } = this
      .options as ConfigureCampaignEditorImageOptions;

    if (!imageAltControls) {
      return null;
    }

    return ReactNodeViewRenderer(ImageAltNodeView);
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      href: {
        default: null,
        parseHTML: (element) => {
          const anchor = element.closest("a");
          const href = anchor?.getAttribute("href");
          return isSafeLinkHref(href) ? href : null;
        },
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: this.options.allowBase64
          ? "img[src]"
          : 'img[src]:not([src^="data:"])',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          const anchor = node.closest("a");
          const href = anchor?.getAttribute("href");

          return {
            src: node.getAttribute("src"),
            alt: node.getAttribute("alt"),
            title: node.getAttribute("title"),
            width: node.getAttribute("width"),
            height: node.getAttribute("height"),
            href: isSafeLinkHref(href) ? href : null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const href = isSafeLinkHref(node.attrs.href) ? node.attrs.href : null;

    return [
      "img",
      {
        ...this.options.HTMLAttributes,
        ...HTMLAttributes,
        ...(href ? { "data-linked-image": "" } : {}),
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey("campaignEditorImageLinkClick"),
        props: {
          handleDOMEvents: {
            mousedown: (view, event) => {
              if (!view.editable || !(event instanceof MouseEvent)) {
                return false;
              }

              if (!event.metaKey && !event.ctrlKey) {
                return false;
              }

              const target = event.target;
              if (!(target instanceof Element)) {
                return false;
              }

              const img = target.closest("img[data-linked-image]");
              if (!img || !view.dom.contains(img)) {
                return false;
              }

              const pos = view.posAtDOM(img, 0);
              const node = view.state.doc.nodeAt(pos);
              const href = node?.attrs.href;

              if (isSafeLinkHref(href)) {
                event.preventDefault();
                window.open(href, "_blank", "noopener,noreferrer");
                return true;
              }

              return false;
            },
          },
        },
      }),
    ];
  },
});

export function configureCampaignEditorImage(
  options: ConfigureCampaignEditorImageOptions,
) {
  return CampaignEditorImageExtension.configure(
    options as Partial<ImageOptions>,
  );
}

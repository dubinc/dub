import Image, { type ImageOptions } from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageAltNodeView } from "./image-alt-node-view";

export type ConfigureImageWithLinkOptions = Partial<ImageOptions> & {
  renderLink?: boolean;
  imageAltControls?: boolean;
};

const ImageWithLinkExtension = Image.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      // When false, the editor renders a plain <img> so clicks select the node.
      // Set to true when exporting HTML (e.g. campaign emails).
      renderLink: false,
      imageAltControls: false,
    } as ImageOptions;
  },

  addNodeView() {
    const { renderLink, imageAltControls } = this
      .options as ConfigureImageWithLinkOptions;

    if (renderLink || !imageAltControls) {
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
          return anchor?.getAttribute("href") ?? null;
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
          const href = anchor?.getAttribute("href") ?? null;

          return {
            src: node.getAttribute("src"),
            alt: node.getAttribute("alt"),
            title: node.getAttribute("title"),
            width: node.getAttribute("width"),
            height: node.getAttribute("height"),
            href,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const href = node.attrs.href;
    const { renderLink } = this.options as ConfigureImageWithLinkOptions;
    const img: [string, Record<string, unknown>] = [
      "img",
      {
        ...this.options.HTMLAttributes,
        ...HTMLAttributes,
        ...(href && !renderLink ? { "data-linked-image": "" } : {}),
      },
    ];

    if (href && renderLink) {
      return [
        "a",
        {
          href,
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
        img,
      ];
    }

    return img;
  },

  addProseMirrorPlugins() {
    const { renderLink } = this.options as ConfigureImageWithLinkOptions;

    if (renderLink) {
      return this.parent?.() ?? [];
    }

    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey("imageWithLinkClick"),
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

              if (node?.attrs.href) {
                event.preventDefault();
                window.open(node.attrs.href, "_blank", "noopener,noreferrer");
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

export const ImageWithLink = ImageWithLinkExtension;

export function configureImageWithLink(options: ConfigureImageWithLinkOptions) {
  return ImageWithLinkExtension.configure(options as Partial<ImageOptions>);
}

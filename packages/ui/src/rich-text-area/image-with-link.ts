import Image, { type ImageOptions } from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const SAFE_LINK_SCHEMES = new Set(["http:", "https:", "mailto:"]);
export function isSafeLinkHref(
  href: string | null | undefined,
): href is string {
  if (!href) {
    return false;
  }

  try {
    return SAFE_LINK_SCHEMES.has(new URL(href).protocol);
  } catch {
    return false;
  }
}

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

export const ImageWithLink = ImageWithLinkExtension;

export function configureImageWithLink(options: ConfigureImageWithLinkOptions) {
  return ImageWithLinkExtension.configure(options as Partial<ImageOptions>);
}

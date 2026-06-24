import Image, { type ImageOptions } from "@tiptap/extension-image";

const SAFE_LINK_SCHEMES = new Set(["http:", "https:", "mailto:"]);

function isSafeLinkHref(href: string | null | undefined): href is string {
  if (!href) {
    return false;
  }

  try {
    return SAFE_LINK_SCHEMES.has(new URL(href).protocol);
  } catch {
    return false;
  }
}

const ImageWithLinkExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      href: {
        default: null,
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ HTMLAttributes, node }) {
    const href = isSafeLinkHref(node.attrs.href) ? node.attrs.href : null;
    const img: [string, Record<string, unknown>] = [
      "img",
      {
        ...this.options.HTMLAttributes,
        ...HTMLAttributes,
      },
    ];

    if (href) {
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
});

export function configureImageWithLink(options: Partial<ImageOptions>) {
  return ImageWithLinkExtension.configure(options);
}

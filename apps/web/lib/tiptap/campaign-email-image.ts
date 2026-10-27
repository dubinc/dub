import { isSafeLinkHref } from "@dub/utils";
import Image, { type ImageOptions } from "@tiptap/extension-image";

const CampaignEmailImageExtension = Image.extend({
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

export function configureCampaignEmailImage(options: Partial<ImageOptions>) {
  return CampaignEmailImageExtension.configure(options);
}

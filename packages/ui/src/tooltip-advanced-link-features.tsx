import { Earth, Incognito, InputPasswordPointer, Timer2, Views } from "./icons";

const advancedLinkFeatures = [
  {
    icon: Views,
    text: "Custom link previews",
    href: "https://dub.co/help/article/custom-link-previews",
  },
  {
    icon: Earth,
    text: "Geo/device targeting",
    href: "https://dub.co/help/article/geo-targeting",
  },
  {
    icon: InputPasswordPointer,
    text: "Password protection",
    href: "https://dub.co/help/article/password-protected-links",
  },
  {
    icon: Timer2,
    text: "Link expiration",
    href: "https://dub.co/help/article/link-expiration",
  },
  {
    icon: Incognito,
    text: "Link cloaking",
    href: "https://dub.co/help/article/link-cloaking",
  },
];

export function AdvancedLinkFeaturesTooltip() {
  return (
    <div className="p-3">
      <span className="block text-sm font-semibold text-neutral-600">
        Advanced link features
      </span>
      <div className="mt-2 flex flex-col gap-2.5 text-xs text-neutral-600">
        {advancedLinkFeatures.map(({ text, icon: Icon, href }) => (
          <a
            key={text}
            href={href}
            target="_blank"
            className="flex items-center gap-2.5 underline decoration-dotted underline-offset-2"
          >
            <Icon className="size-3.5 shrink-0" />
            {text}
          </a>
        ))}
      </div>
    </div>
  );
}

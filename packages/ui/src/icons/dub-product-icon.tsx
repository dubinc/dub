import { cn } from "@dub/utils";
import { DubAnalyticsIcon } from "./dub-analytics";
import { DubApiIcon } from "./dub-api";
import { DubLinksIcon } from "./dub-links";
import { DubPartnersIcon } from "./dub-partners";

const icons = {
  links: {
    icon: DubLinksIcon,
    className: "text-orange-900 bg-orange-400",
  },
  analytics: {
    icon: DubAnalyticsIcon,
    className: "text-green-900 bg-green-400",
  },
  partners: {
    icon: DubPartnersIcon,
    className: "text-purple-900 bg-purple-400",
  },
  api: {
    icon: DubApiIcon,
    className: "text-neutral-900 bg-neutral-400",
  },
};

export type DubProduct = keyof typeof icons;

export function DubProductIcon({
  product,
  className,
  iconClassName,
}: {
  product: keyof typeof icons;
  className?: string;
  iconClassName?: string;
}) {
  const { icon: Icon, className: productClassName } = icons[product];

  return (
    <span
      className={cn(
        "flex size-4 items-center justify-center rounded border border-black/5",
        productClassName,
        className,
      )}
    >
      <Icon className={cn("size-2.5", iconClassName)} />
    </span>
  );
}

import { cn } from "#/lib/utils";
import BlurImage from "#/ui/blur-image";

const logos = [
  {
    slug: "vercel",
    className: "h-5 sm:h-7",
  },
  {
    slug: "tinybird",
    className: "h-7 sm:h-10",
  },
  {
    slug: "hashnode",
    className: "h-6 sm:h-8",
  },
  {
    slug: "checkly",
    className: "h-6 sm:h-8 mt-2",
  },
  {
    slug: "cal",
    className: "h-4 sm:h-6",
  },
  {
    slug: "perplexity",
    className: "h-6 sm:h-8",
  },
  {
    slug: "replicate",
    className: "h-6 sm:h-8",
  },
  {
    slug: "super",
    className: "h-4 sm:h-6",
  },
  {
    slug: "chronicle",
    className: "h-6 sm:h-8",
  },
  {
    slug: "attio",
    className: "h-7 sm:h-10",
  },
  {
    slug: "crowd",
    className: "h-4 sm:h-6 -mt-1.5",
  },
  {
    slug: "chatwoot",
    className: "h-5 sm:h-7 -mt-1",
  },
];

export default function Logos({
  copy = "Giving superpowers to marketing teams at world-class companies",
}: {
  copy?: string;
}) {
  return (
    <div className="mt-20">
      <p className="mx-auto max-w-sm text-center text-gray-600 sm:max-w-xl sm:text-lg">
        {copy}
      </p>
      <div className="mx-auto mt-8 grid w-full max-w-screen-lg grid-cols-2 items-center gap-5 px-5 sm:grid-cols-6 sm:px-0">
        {logos.slice(0, 6).map(({ slug, className }) => (
          <BlurImage
            src={`/_static/clients/${slug}.svg`}
            alt={slug.toUpperCase()}
            width={2418}
            height={512}
            className={cn(
              "grayscale transition-all hover:grayscale-0",
              className,
            )}
          />
        ))}
      </div>
      <div className="mx-auto mt-5 grid w-full max-w-screen-lg grid-cols-2 items-center gap-5 px-5 sm:mt-8 sm:grid-cols-6 sm:px-0">
        {logos.slice(6, 12).map(({ slug, className }) => (
          <BlurImage
            src={`/_static/clients/${slug}.svg`}
            alt={slug.toUpperCase()}
            width={2418}
            height={512}
            className={cn(
              "grayscale transition-all hover:grayscale-0",
              className,
            )}
          />
        ))}
      </div>
    </div>
  );
}

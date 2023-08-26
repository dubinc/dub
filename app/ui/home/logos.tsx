import BlurImage from "#/ui/blur-image";

const logos = [
  {
    slug: "vercel",
    dimensions: "h-5 sm:h-7",
  },
  {
    slug: "tinybird",
    dimensions: "h-7 sm:h-10",
  },
  {
    slug: "hashnode",
    dimensions: "h-6 sm:h-8",
  },
  {
    slug: "checkly",
    dimensions: "h-6 sm:h-8",
  },
  {
    slug: "cal",
    dimensions: "h-4 sm:h-6",
  },
  {
    slug: "perplexity",
    dimensions: "h-6 sm:h-8",
  },
  {
    slug: "replicate",
    dimensions: "h-6 sm:h-8",
  },
  {
    slug: "super",
    dimensions: "h-4 sm:h-6",
  },
  {
    slug: "chronicle",
    dimensions: "h-6 sm:h-8",
  },
  {
    slug: "attio",
    dimensions: "h-7 sm:h-10",
  },
  {
    slug: "crowd",
    dimensions: "h-4 sm:h-6 -mt-2",
  },
  {
    slug: "chatwoot",
    dimensions: "h-5 sm:h-7 -mt-2",
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
        {logos.slice(0, 6).map(({ slug, dimensions }) => (
          <BlurImage
            src={`/_static/clients/${slug}.svg`}
            alt={slug.toUpperCase()}
            width={2418}
            height={512}
            className={`col-span-1 transition-all group-hover:opacity-20 group-hover:blur-sm ${dimensions}`}
          />
        ))}
      </div>
      <div className="mx-auto mt-8 grid w-full max-w-screen-lg grid-cols-2 items-center gap-5 px-5 sm:grid-cols-6 sm:px-0">
        {logos.slice(6, 12).map(({ slug, dimensions }) => (
          <BlurImage
            src={`/_static/clients/${slug}.svg`}
            alt={slug.toUpperCase()}
            width={2418}
            height={512}
            className={`col-span-1 transition-all group-hover:opacity-20 group-hover:blur-sm ${dimensions}`}
          />
        ))}
      </div>
    </div>
  );
}

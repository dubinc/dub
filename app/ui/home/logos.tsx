import BlurImage from "#/ui/blur-image";
import Link from "next/link";

const logos = [
  "vercel",
  "prisma",
  "tinybird",
  "hashnode",
  "cal",
  "perplexity",
  "replicate",
  "super",
  "chronicle",
  "attio",
  "crowd",
  "checkly",
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
      <Link
        href="/customers"
        className="mx-auto mt-8 grid w-full max-w-screen-lg grid-cols-2 items-center px-5 md:grid-cols-6 md:px-0"
      >
        {logos.slice(0, 6).map((logo) => (
          <BlurImage
            src={`/_static/clients/${logo}.svg`}
            alt={logo.toUpperCase()}
            width={520}
            height={182}
            className="h-12 grayscale transition-all hover:grayscale-0 md:h-20"
          />
        ))}
      </Link>
      <Link
        href="/customers"
        className="mx-auto grid w-full max-w-screen-lg grid-cols-2 items-center px-5 md:grid-cols-6 md:px-0"
      >
        {logos.slice(6, 12).map((logo) => (
          <BlurImage
            src={`/_static/clients/${logo}.svg`}
            alt={logo.toUpperCase()}
            width={520}
            height={182}
            className="h-12 grayscale transition-all hover:grayscale-0 md:h-20"
          />
        ))}
      </Link>
    </div>
  );
}

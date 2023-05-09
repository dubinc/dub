import Link from "next/link";
import BlurImage from "#/ui/blur-image";
import { ExpandingArrow } from "#/ui/icons";

const logos = [
  {
    slug: "vercel",
    link: "vercel.fyi",
    dimensions: "h-5 sm:h-7",
  },
  {
    slug: "tinybird",
    link: "tbrd.co",
    dimensions: "h-7 sm:h-10",
  },
  {
    slug: "checkly",
    link: "chkly.co",
    dimensions: "h-6 sm:h-8",
  },
  {
    slug: "cal",
    link: "go.cal.com",
    dimensions: "h-4 sm:h-6",
  },
  {
    slug: "crowdin",
    link: "l.crowdin.com",
    dimensions: "h-6 sm:h-8",
  },
  {
    slug: "lugg",
    link: "short.lu.gg",
    dimensions: "h-14 sm:h-20",
  },
];

export default function Logos() {
  return (
    <div className="mt-20">
      <p className="mx-auto max-w-sm text-center text-gray-600 sm:max-w-xl sm:text-lg">
        Giving superpowers to marketing teams at world-class companies
      </p>
      <div className="mx-auto mt-8 grid w-full max-w-screen-lg grid-cols-2 items-center gap-5 px-5 sm:grid-cols-6 sm:px-0">
        {logos.map(({ slug, link, dimensions }) => (
          <Link
            key={slug}
            href={`https://${link}`}
            target="_blank"
            rel="noopener noreferer"
            className="group relative"
          >
            <div className="absolute z-10 flex h-full w-full translate-y-5 items-center justify-center opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
              <p className="font-semibold text-gray-700">{link}</p>
              <ExpandingArrow />
            </div>
            <BlurImage
              src={`/_static/clients/${slug}.svg`}
              alt={slug.toUpperCase()}
              width={2418}
              height={512}
              className={`col-span-1 transition-all group-hover:opacity-20 group-hover:blur-sm ${dimensions}`}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

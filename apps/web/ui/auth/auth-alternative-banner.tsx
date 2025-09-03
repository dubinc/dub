import { DotsPattern } from "@dub/ui";
import Link from "next/link";

export function AuthAlternativeBanner({
  text,
  cta,
  href,
}: {
  text: string;
  cta: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="relative block overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-4 transition-colors hover:bg-neutral-100"
    >
      <div
        className="absolute inset-y-0 left-1/2 w-[640px] -translate-x-1/2"
        role="presentation"
      >
        <DotsPattern patternOffset={[1, 5]} className="text-neutral-200" />
      </div>
      <div className="relative text-center text-sm text-neutral-600">
        <p>{text}</p>
        <span className="block font-semibold text-neutral-800">{cta}</span>
      </div>
    </Link>
  );
}

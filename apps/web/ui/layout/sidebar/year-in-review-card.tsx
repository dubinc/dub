"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { cn } from "@dub/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function YearInReviewCard() {
  const pathname = usePathname();
  const { slug, yearInReview } = useWorkspace();

  if (!yearInReview) return null;

  return (
    <Link
      href={`/${slug}/wrapped/2024`}
      className={cn(
        "group m-3 mt-8 h-44 select-none gap-2 overflow-hidden rounded-lg border border-neutral-200 bg-white p-3 text-[0.8125rem] transition-[height] duration-200 hover:h-52",
        pathname.endsWith("/wrapped/2024") && "h-52",
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="line-clamp-1 font-medium text-neutral-900">
          Dub 2024 Year in Review 🎊
        </span>
        <p className="line-clamp-2 h-10 leading-5 text-neutral-500">
          As we put a wrap on 2024, we want to say thank you for your support!
        </p>
      </div>
      <div className="relative mt-3 aspect-[16/9] w-full shrink-0 overflow-hidden rounded border border-neutral-200 bg-neutral-100">
        <div
          className={cn(
            "absolute z-10 h-36 w-full bg-gradient-to-b from-transparent to-white transition-[opacity] duration-200 group-hover:opacity-0",
            pathname.endsWith("/wrapped/2024") && "opacity-0",
          )}
        />
        <Image
          src="https://assets.dub.co/blog/2024.jpg"
          alt="Dub logo with confetti"
          fill
          sizes="10vw"
          className="rounded object-cover object-center"
          draggable={false}
        />
      </div>
    </Link>
  );
}

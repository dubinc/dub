"use client";

import { useMediaQuery } from "@dub/ui";
import Link from "next/link";
import { FC } from "react";
import { Rating } from "./components/rating.tsx";

export const RatingInfoSection: FC = () => {
  const { isMobile } = useMediaQuery();

  if (isMobile) return null;

  return (
    <section className="bg-primary-100 mx-auto flex w-full max-w-[1172px] flex-row items-center justify-between gap-[42px] px-3 py-[42px]">
      <Rating alignItems={"start"} />
      <Link
        href={"/register"}
        className="bg-secondary hover:bg-secondary/90 flex h-11 max-w-[246px] items-center justify-center rounded-lg px-6 py-3 text-base font-medium text-white"
      >
        Create your free account
      </Link>
      <p className="text-neutral-200">
        No credit card is required during registration.
      </p>
    </section>
  );
};

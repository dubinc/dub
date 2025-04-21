"use client";

import { useMediaQuery } from "@dub/ui";
import { Button, Text } from "@radix-ui/themes";
import Link from "next/link";
import { FC } from "react";
import { Rating } from "./components/rating.tsx";

export const RatingInfoSection: FC = () => {
  const { isMobile } = useMediaQuery();

  if (isMobile) return null;

  return (
    <section className="bg-primary-100 mx-auto flex w-full max-w-[1172px] flex-row items-center justify-between gap-[42px] px-3 py-[42px]">
      <Rating alignItems={"start"} />
      <Button variant="solid" size="3" color="blue">
        <Link href={"/register"}>Create your free account</Link>
      </Button>
      <Text size="3" className="text-neutral-200">
        No credit card is required during registration.
      </Text>
    </section>
  );
};

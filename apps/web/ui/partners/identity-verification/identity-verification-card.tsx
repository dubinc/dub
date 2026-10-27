"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { useIdentityVerificationPromo } from "@/ui/partners/identity-verification/use-identity-verification-promo";
import { Grid, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

export function IdentityVerificationCard() {
  const pathname = usePathname();
  const { partner } = usePartnerProfile();
  const { status } = useIdentityVerificationPromo();

  if (!partner || status !== "card") return null;

  if (pathname === "/profile") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="border-border-subtle relative m-3 mt-8 select-none gap-2 overflow-hidden rounded-lg border bg-white"
      >
        <div className="absolute inset-0 [background-image:radial-gradient(200%_150%_at_100%_0%,#C28E5222,transparent_50%)]">
          <Grid
            cellSize={32}
            strokeWidth={2}
            patternOffset={[-8, -12]}
            className="text-border-subtle/40 [mask-image:linear-gradient(45deg,black_50%,#0003_100%)]"
          />
        </div>

        <Link
          href="/profile#identity-verification"
          className="relative flex w-full flex-col gap-3 p-3 text-left"
        >
          <div
            className="animate-float"
            style={{ "--r": "0.5%" } as CSSProperties}
          >
            <Image
              src="https://assets.dub.co/misc/verified-badge-shield.png"
              alt="Verified badge shield"
              width={128}
              height={128}
              className="m-4 size-14 rotate-[-8deg] scale-125 object-contain"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-content-emphasis line-clamp-1 text-sm font-semibold">
              Verify your identity
            </span>
            <p className="text-content-subtle line-clamp-2 text-xs">
              Build trust with programs and improve your approval chances.
            </p>
          </div>

          <span
            className={cn(
              buttonVariants({ variant: "primary" }),
              "flex h-6 w-fit items-center justify-center whitespace-nowrap rounded-md border px-1.5 text-xs",
            )}
          >
            Verify now
          </span>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}

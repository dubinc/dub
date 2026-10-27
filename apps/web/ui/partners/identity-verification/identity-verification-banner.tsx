"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { useIdentityVerificationPromo } from "@/ui/partners/identity-verification/use-identity-verification-promo";
import { X } from "@/ui/shared/icons";
import { Button, Grid, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

export function IdentityVerificationBanner() {
  const { partner } = usePartnerProfile();
  const { status, setStatus } = useIdentityVerificationPromo();

  return (
    <AnimatePresence>
      {partner && status === "banner" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              "border-border-subtle relative mb-4 gap-x-2 overflow-hidden rounded-xl border bg-white sm:h-12 lg:mb-6",
            )}
          >
            <div className="absolute inset-0">
              <div
                className={cn(
                  "absolute inset-0 opacity-10 blur-xl sm:-scale-x-100 sm:opacity-20",
                  "[background-image:radial-gradient(140%_146%_at_93%_14%,#F6DEAE,rgba(246,222,174,0)_50%),radial-gradient(126%_82%_at_56%_100%,#94704C,rgba(148,112,76,0)_50%),radial-gradient(131%_124%_at_11%_35%,#3A8BFD,rgba(58,139,253,0)_45%),radial-gradient(117%_77%_at_100%_100%,#C28E52,rgba(194,142,82,0)_50%),radial-gradient(86%_74%_at_40%_59%,#855AFC,rgba(133,90,252,0)_40%)]",
                )}
              />
              <Grid
                cellSize={32}
                strokeWidth={2}
                patternOffset={[-8, -12]}
                className="text-border-subtle/40 [mask-image:linear-gradient(90deg,black_50%,#0003_100%)]"
              />
            </div>

            <div className="relative flex h-full flex-col justify-between sm:flex-row">
              <div className="flex h-full min-w-0 flex-col gap-x-2 sm:flex-row sm:items-center">
                <div className="h-full shrink-0 overflow-hidden px-2 py-3 sm:p-0">
                  <div className="relative h-24 w-40 shrink-0 sm:h-full sm:w-16">
                    <div className="absolute left-2 right-0 top-1/2 flex h-full -translate-y-1/2 items-center justify-center sm:h-24 sm:rotate-[-4deg]">
                      <div
                        className="animate-float"
                        style={{ "--r": "2%" } as CSSProperties}
                      >
                        <Image
                          src="https://assets.dub.co/misc/verified-badge-shield.png"
                          alt="Verified badge shield"
                          width={128}
                          height={128}
                          className="size-12 object-contain sm:size-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <p
                  className="text-content-subtle flex min-w-0 flex-col px-3 text-base sm:block sm:truncate sm:px-0 sm:text-sm xl:text-base"
                  title="Verify your identity on Dub. Programs trust verified partners—stand out and get approved faster."
                >
                  <span className="text-content-emphasis font-semibold">
                    Verify your identity on Dub.
                  </span>{" "}
                  <span className="font-medium">
                    Build trust with programs and improve your approval chances.
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 sm:px-2 sm:py-0">
                <Link
                  href="/profile#identity-verification"
                  className={cn(
                    buttonVariants({ variant: "primary" }),
                    "flex h-8 w-fit items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm",
                  )}
                >
                  Verify now
                </Link>

                <Button
                  variant="outline"
                  icon={<X className="size-4" />}
                  className="hidden size-8 rounded-lg bg-black/5 p-0 hover:bg-black/10 sm:flex"
                  onClick={() => setStatus("card")}
                />
              </div>
            </div>

            <Button
              variant="outline"
              icon={<X className="size-4" />}
              className="absolute right-2 top-2 size-8 rounded-lg bg-black/5 p-0 hover:bg-black/10 sm:hidden"
              onClick={() => setStatus("card")}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

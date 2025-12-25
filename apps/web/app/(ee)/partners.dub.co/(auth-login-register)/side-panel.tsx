import { DubPartnersLogo } from "@/ui/dub-partners-logo";
import { Program } from "@dub/prisma/client";
import Link from "next/link";
import { ProgramLogos } from "./program-logos";

export function SidePanel({
  program,
}: {
  program?: Pick<Program, "name" | "logo" | "slug">;
}) {
  return (
    <div className="hidden h-full flex-col items-start justify-between gap-8 overflow-hidden border-r border-black/5 bg-neutral-50 min-[900px]:flex">
      {program ? (
        <></>
      ) : (
        <>
          <div className="grow basis-0 p-4 lg:p-10">
            <DubPartnersLogo className="w-fit" />
          </div>

          <div className="flex flex-col gap-6 px-4 lg:px-10">
            <p className="text-content-default max-w-[370px] text-pretty text-xl font-medium">
              Join thousands of others who have earned over $10,000,000 on Dub
              partnering with world-class companies.
            </p>
            <Link
              target="_blank"
              href="https://dub.co/partners"
              className="text-content-emphasis flex h-8 w-fit items-center rounded-lg bg-black/5 px-3 text-sm font-medium transition-[transform,background-color] duration-75 hover:bg-black/10 active:scale-[0.98]"
            >
              Read more
            </Link>
          </div>

          <div className="w-full grow basis-0">
            <ProgramLogos />
          </div>
        </>
      )}
    </div>
  );
}

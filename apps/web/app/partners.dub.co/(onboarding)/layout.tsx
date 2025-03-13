import Toolbar from "@/ui/layout/toolbar/toolbar";
import { Grid, Wordmark } from "@dub/ui";

export default function PartnerOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex min-h-screen flex-col">
        <div className="fixed left-1/2 top-0 h-full w-[1280px] -translate-x-1/2 [mask-image:radial-gradient(50%_70%_at_50%_0%,black_70%,transparent)]">
          <Grid
            cellSize={80}
            patternOffset={[-79.25, -59]}
            className="text-neutral-200"
          />
        </div>
        <div className="relative z-10 mt-10 flex w-full flex-col items-center justify-center px-3 text-center md:px-8">
          <div className="animate-slide-up-fade relative flex w-auto flex-col items-center [--offset:10px] [animation-duration:1.3s] [animation-fill-mode:both]">
            <Wordmark className="relative h-10" />
            <span className="text-sm font-medium text-neutral-700">
              Partner
            </span>
          </div>
          {children}
        </div>
      </div>
      <Toolbar show={["help"]} />
    </>
  );
}

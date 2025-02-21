import { Button, NavWordmark } from "@dub/ui";

export function CreateProgramCard() {
  return (
    <div className="relative mt-6 flex flex-col gap-3 overflow-hidden rounded-lg border border-black/[0.1] bg-white p-3 pt-4 shadow-[0px_1px_1px_0px_#0000000A] [box-shadow:inset_0px_0px_8px_0px_#FFFFFF]">
      <div className="absolute inset-0 opacity-[0.08] [background:conic-gradient(from_0deg_at_50%_50%,#F35066_0deg,#F35066_117deg,#9071F9_180deg,#5182FC_240deg,#F35066_360deg)]" />

      <div className="relative flex items-center gap-2">
        <NavWordmark variant="symbol" className="h-4 w-4" />
      </div>

      <div className="relative flex flex-col gap-1">
        <h1 className="text-sm font-semibold text-neutral-900">Dub Partners</h1>
        <p className="text-sm text-neutral-800">
          Grow your revenue on autopilot with Dub Partners
        </p>
      </div>

      <Button text="Create program" className="relative" />
    </div>
  );
}

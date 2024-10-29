import { Grid } from "@dub/ui";

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 [mask-image:radial-gradient(60%_60%_at_50%_0%,black,transparent)]">
        <Grid className="text-neutral-200" />
        <div className="absolute inset-0 -translate-y-1/2 -scale-x-100 bg-[conic-gradient(from_-32deg,#f00_0deg,#EAB308_99deg,#5CFF80_162deg,#00FFF9_216deg,#3A8BFD_288deg,#855AFC_360deg)] opacity-25 blur-[200px]" />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center">
        {children}
      </div>
    </>
  );
}

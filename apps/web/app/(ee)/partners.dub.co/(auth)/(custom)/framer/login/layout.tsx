import { Grid, Wordmark } from "@dub/ui";

export default function CustomPartnerAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="fixed inset-0 [mask-image:radial-gradient(60%_60%_at_50%_0%,black,transparent)]">
        <Grid className="text-neutral-200" />
        <div className="absolute inset-0 -translate-y-1/2 -scale-x-100 bg-[conic-gradient(from_-32deg,#f00_0deg,#EAB308_99deg,#5CFF80_162deg,#00FFF9_216deg,#3A8BFD_288deg,#855AFC_360deg)] opacity-25 blur-[200px]" />
      </div>
      <div className="relative z-10 flex grow flex-col items-center justify-center px-3 text-center md:px-8">
        {children}
      </div>
      <div className="flex flex-col justify-end">
        <div className="relative flex w-full flex-col items-center justify-center gap-2 py-10 pb-6">
          <a
            href="https://dub.partners"
            target="_blank"
            className="mt-4 flex items-center justify-center gap-1.5 text-neutral-500 transition-colors duration-75 hover:text-neutral-700"
          >
            <p className="text-xs font-medium">Powered by</p>
            <Wordmark className="h-3.5 text-neutral-900" />
          </a>

          <div className="flex gap-3 text-center text-xs text-neutral-500 underline underline-offset-2">
            <a
              href="https://dub.co/legal/privacy"
              target="_blank"
              className="hover:text-neutral-800"
            >
              Privacy Policy
            </a>
            <a
              href="https://dub.co/legal/terms"
              target="_blank"
              className="hover:text-neutral-800"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

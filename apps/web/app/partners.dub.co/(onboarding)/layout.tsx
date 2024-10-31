import { Grid, Wordmark } from "@dub/ui";

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
      <div className="relative z-10 mt-10 flex w-full flex-col items-center justify-center px-3 text-center md:px-8">
        <div className="animate-slide-up-fade relative flex w-auto flex-col items-center [--offset:10px] [animation-duration:1.3s] [animation-fill-mode:both]">
          <Wordmark className="relative h-10" />
          <span className="text-sm font-medium text-neutral-700">Partner</span>
        </div>
        {children}
      </div>
      <div className="fixed bottom-4 left-0 right-0 flex flex-col items-center justify-center gap-2">
        <p className="text-xs text-gray-600">
          © {new Date().getFullYear()} Dub Technologies, Inc.
        </p>
        <div className="flex gap-3 text-center text-xs text-gray-500 underline underline-offset-2">
          <a
            href="https://dub.co/legal/privacy"
            target="_blank"
            className="hover:text-gray-800"
          >
            Privacy Policy
          </a>
          <a
            href="https://dub.co/legal/terms"
            target="_blank"
            className="hover:text-gray-800"
          >
            Terms of Service
          </a>
          <a
            href="https://app.dub.co"
            target="_blank"
            className="hover:text-gray-800"
          >
            app.dub.co
          </a>
        </div>
      </div>
    </>
  );
}

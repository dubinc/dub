import { geistMono, inter, satoshi } from "@/styles/fonts";
import { Button, Wordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import RootProviders from "app/providers";
import Link from "next/link";
import { Steps } from "./onboarding/steps";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(satoshi.variable, inter.variable, geistMono.variable)}
    >
      <body>
        <div className="min-h-screen bg-white">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
            <div className="flex items-center gap-5">
              <Link href="/" className="flex items-center">
                <Wordmark className="h-7" />
              </Link>
              <h1 className="hidden text-base font-semibold text-neutral-700 md:block">
                Create partner program
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button text="Cancel" variant="outline" className="h-7 w-auto" />
              <Button
                text="Save and exit"
                variant="secondary"
                className="h-7 w-auto"
              />
            </div>
          </header>

          <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)]">
            <Steps />
            <main className="px-4 py-6 md:px-8">
              {" "}
              <RootProviders>{children}</RootProviders>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

// import { geistMono, inter, satoshi } from "@/styles/fonts";
// import "@/styles/globals.css";
// import { cn, constructMetadata } from "@dub/utils";
// import RootProviders from "./providers";

// export const metadata = constructMetadata();

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html
//       lang="en"
//       className={cn(satoshi.variable, inter.variable, geistMono.variable)}
//     >
//       <body>
//         <RootProviders>{children}</RootProviders>
//       </body>
//     </html>
//   );
// }

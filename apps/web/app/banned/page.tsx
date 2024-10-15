import { Background, Footer, Nav, NavMobile } from "@dub/ui";
import { constructMetadata } from "@dub/utils";
import { ShieldBan } from "lucide-react";

export const runtime = "edge";

export const metadata = constructMetadata({
  title: "Banned Link – Dub.co",
  description: "This link has been banned for violating our terms of service.",
  noIndex: true,
});

export default async function BannedPage() {
  return (
    <main className="flex min-h-screen flex-col justify-between">
      <NavMobile />
      <Nav />
      <div className="z-10 mx-2 my-10 flex max-w-md flex-col items-center space-y-5 px-2.5 text-center sm:mx-auto sm:max-w-lg sm:px-0 lg:mb-16">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-gray-300 bg-white/30">
          <ShieldBan className="size-6 text-gray-500" />
        </div>
        <h1 className="font-display text-5xl font-bold">Banned Link</h1>
        <p className="text-lg text-gray-600">
          This link has been banned for violating our terms of service.
        </p>
        <a
          href="https://dub.co/home"
          className="rounded-full bg-gray-800 px-10 py-2 font-medium text-white transition-colors hover:bg-black"
        >
          Create Your Free Branded Link
        </a>
      </div>
      <Footer />
      <Background />
    </main>
  );
}

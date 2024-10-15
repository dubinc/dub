import { Background, Footer, GlobeSearch, Nav, NavMobile } from "@dub/ui";
import { constructMetadata } from "@dub/utils";

export const runtime = "edge";

export const metadata = constructMetadata({
  title: "Link Not Found – Dub.co",
  description:
    "This link does not exist on Dub.co. Please check the URL and try again.",
  noIndex: true,
});

export default async function NotFoundLinkPage() {
  return (
    <main className="flex min-h-screen flex-col justify-between">
      <NavMobile />
      <Nav />
      <div className="z-10 mx-2 my-10 flex max-w-md flex-col items-center space-y-5 px-2.5 text-center sm:mx-auto sm:max-w-lg sm:px-0 lg:mb-16">
        <div className="font-display mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-gray-300 bg-white/80 text-lg font-bold text-gray-400">
          <GlobeSearch className="size-6 text-gray-500" />
        </div>
        <h1 className="font-display text-5xl font-bold">Link Not Found</h1>
        <p className="text-lg text-gray-600">
          This link does not exist. Please check the URL and try again.
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

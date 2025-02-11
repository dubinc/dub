import { Footer, Nav, NavMobile } from "@dub/ui";

export default function CustomDomainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-gray-50/80">
      <NavMobile />-neutral-
      <Nav maxWidthWrapperClassName="max-w-screen-lg lg:px-4 xl:px-0" />
      {children}
      <Footer className="max-w-screen-lg border-0 bg-transparent lg:px-4 xl:px-0" />
    </div>
  );
}

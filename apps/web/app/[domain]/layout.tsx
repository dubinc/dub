import { NewBackground } from "@/ui/shared/new-background";
import { Footer, Nav, NavMobile } from "@dub/ui";

export default function CustomDomainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-gray-50/80">
      <NavMobile />
      <Nav />
      {children}
      <Footer />
      <NewBackground />
    </div>
  );
}

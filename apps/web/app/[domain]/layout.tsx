// import { Footer, Nav, NavMobile } from "@dub/ui";
//
// export default function Layout({ children }: { children: React.ReactNode }) {
//   return (
//     <div className="flex min-h-screen flex-col justify-between bg-neutral-50/80">
//       <NavMobile />
//       <Nav maxWidthWrapperClassName="max-w-screen-lg lg:px-4 xl:px-0" />
//       {children}
//       <Footer className="max-w-screen-lg border-0 bg-transparent lg:px-4 xl:px-0" />
//     </div>
//   );
// }

import { Footer } from "@/ui/landing/components/footer";
import { Header } from "@/ui/landing/components/header.tsx";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50/80">
      <Header />
      {children}
      <Footer />
    </div>
  );
}

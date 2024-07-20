import { Footer, Nav, NavMobile } from "@dub/ui";

export default function CustomDomainLayout(props) {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-gray-50/80">
      <NavMobile />
      <Nav />
      {props.children}
      <Footer />
    </div>
  );
}

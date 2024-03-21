import { Footer, Nav, NavMobile, ProductHunt } from "@dub/ui";

export default function CustomDomainLayout(props) {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-gray-50">
      <NavMobile />
      <Nav />
      <ProductHunt />
      {props.children}
      <Footer />
    </div>
  );
}

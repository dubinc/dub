import { Footer, Nav, NavMobile } from "ui";

export default function CustomDomainLayout(props) {
  return (
    <div className="flex min-h-screen flex-col justify-between">
      <NavMobile />
      <Nav />
      {props.children}
      <Footer />
    </div>
  );
}

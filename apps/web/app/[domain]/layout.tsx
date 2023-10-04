import MobileNav from "#/ui/home/nav-mobile";
import Nav from "#/ui/home/nav";
import Footer from "#/ui/home/footer";

export default function CustomDomainLayout(props) {
  return (
    <div className="flex min-h-screen flex-col justify-between">
      <MobileNav />
      <Nav />
      {props.children}
      <Footer />
    </div>
  );
}

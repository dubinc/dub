import MarketingProviders from "./providers";
import Nav from "#/ui/home/nav";
import Footer from "#/ui/home/footer";
import Background from "#/ui/home/background";
import MobileNav from "#/ui/home/nav-mobile";

export default function MarketingLayout(props) {
  return (
    <MarketingProviders modal={props.modal}>
      <div className="flex min-h-screen flex-col">
        <MobileNav />
        <Nav />
        {props.children}
        <Footer />
        <Background />
      </div>
    </MarketingProviders>
  );
}

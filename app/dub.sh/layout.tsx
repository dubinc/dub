import Nav from "#/ui/home/nav";
import Footer from "#/ui/home/footer";
import Script from "next/script";
import OneTapComponent from "#/ui/one-tap";

export default function MarketingLayout(props) {
  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="beforeInteractive"
      />
      <OneTapComponent />
      <div className="flex min-h-screen flex-col justify-between">
        {/* Only show stats modal if not on the /stats page */}
        {props.children.props.childProp.segment !== "stats" && props.modal}
        <Nav />
        {props.children}
        <Footer />
      </div>
    </>
  );
}

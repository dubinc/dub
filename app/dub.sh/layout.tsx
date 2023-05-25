import Nav from "#/ui/home/nav";
import Footer from "#/ui/home/footer";

const excludedSegments = new Set(["stats", "__DEFAULT__"]);

export default function MarketingLayout(props) {
  return (
    <div className="flex min-h-screen flex-col justify-between">
      {/* Only show stats modal if not on the /stats page */}
      {!excludedSegments.has(props.children.props.childProp.segment) &&
        props.modal}
      <Nav />
      {props.children}
      <Footer />
    </div>
  );
}

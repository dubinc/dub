import LayoutLoader from "@/ui/layout/layout-loader";

export default function Loading() {
  return (
    <div className="h-screen w-screen bg-neutral-50">
      <LayoutLoader />
    </div>
  );
}

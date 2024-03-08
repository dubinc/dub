import LayoutLoader from "@/ui/layout/layout-loader";

export default function Loading() {
  return (
    <div className="h-screen w-screen bg-gray-50">
      <LayoutLoader />
    </div>
  );
}

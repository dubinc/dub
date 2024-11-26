import { LoadingSpinner } from "@dub/ui/src/icons";

export default function EmbedWidgetLoading() {
  return (
    <div className="flex h-full min-h-screen w-full items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

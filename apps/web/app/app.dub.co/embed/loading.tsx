import { LoadingSpinner } from "@dub/ui/icons";

export default function EmbedLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

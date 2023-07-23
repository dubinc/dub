import Stats from "#/ui/stats";
import Modal from "#/ui/modal";
import { Suspense } from "react";

export default function StatsModal({ params }: { params: { key: string } }) {
  return (
    <Modal className="max-h-[calc(100vh-150px)] w-full max-w-screen-xl overflow-auto bg-gray-50 scrollbar-hide">
      <Suspense>
        <Stats staticDomain="dub.sh" staticKey={params.key} modal />
      </Suspense>
    </Modal>
  );
}

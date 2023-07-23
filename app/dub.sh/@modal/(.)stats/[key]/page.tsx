import Stats from "#/ui/stats";
import Modal from "#/ui/modal";
import { Suspense } from "react";

export default function StatsModal({ params }: { params: { key: string } }) {
  return (
    <Modal className="bg-gray-50">
      <div
        className="max-h-[calc(100vh-150px)] w-full overflow-scroll bg-gray-50 align-middle shadow-xl
        scrollbar-hide md:w-[768px] md:rounded-2xl md:border md:border-gray-200 lg:w-[1024px] xl:w-[1280px]"
      >
        <Suspense>
          <Stats staticDomain="dub.sh" staticKey={params.key} modal />
        </Suspense>
      </div>
    </Modal>
  );
}

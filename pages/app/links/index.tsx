import AppLayout from "components/layout/app";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import LinkCard from "@/components/app/link-card";
import PlaceholderCard from "@/components/app/placeholder-card";
import { LinkProps } from "@/lib/types";
import { useAddModal } from "@/components/app/add-modal";

export default function Links() {
  const router = useRouter();

  const { data } = useSWR<LinkProps[]>(router.isReady && `/api/links`, fetcher);

  const { setShowAddModal, AddModal } = useAddModal({});

  return (
    <AppLayout>
      <AddModal />
      <div className="py-12 bg-white border-b border-gray-200">
        <MaxWidthWrapper>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl text-gray-600">Links</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="font-medium text-sm text-gray-500 px-5 py-2 border rounded-md border-gray-200 dark:border-gray-600 hover:border-black dark:hover:border-white active:scale-95 transition-all duration-75"
            >
              Add
            </button>
          </div>
        </MaxWidthWrapper>
      </div>
      <MaxWidthWrapper>
        <div className="my-10 grid grid-cols-1 gap-3">
          {data && data.length > 0
            ? data.map((props) => <LinkCard key={props.key} props={props} />)
            : Array.from({ length: 3 }).map((_, i) => (
                <PlaceholderCard key={i} />
              ))}
        </div>
      </MaxWidthWrapper>
    </AppLayout>
  );
}

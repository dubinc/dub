import { useRouter } from "next/router";
import StatusFilter from "./status-filter";
import UserFilter from "./user-filter";

export default function LinkFilters() {
  const router = useRouter();
  const { slug } = router.query as { slug?: string };
  return (
    <div className="my-5 flex justify-end">
      <StatusFilter />
      {slug && (
        <>
          <div className="w-4" />
          <UserFilter />
        </>
      )}
    </div>
  );
}

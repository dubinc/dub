import { NetworkProgramProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { FeaturedProgramCard } from "./program-card";

export function FeaturedPrograms() {
  const { data: programs, error } = useSWR<NetworkProgramProps[]>(
    `/api/network/programs?featured=true`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  return programs?.length === 0 ? null : (
    <div>
      <h2 className="text-content-emphasis text-base font-semibold">
        Featured programs
      </h2>
      <div className="@3xl/page:grid-cols-2 mt-4 grid grid-cols-1 gap-4">
        {programs ? (
          programs.map((program) => (
            <FeaturedProgramCard key={program.id} program={program} />
          ))
        ) : (
          <>
            <FeaturedProgramCard />
            <FeaturedProgramCard />
          </>
        )}
      </div>
    </div>
  );
}

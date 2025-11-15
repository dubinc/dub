"use client";

import { PublicProgram } from "@/lib/fetchers/get-public-programs";
import { ProgramCard } from "./program-card.tsx";

interface ProgramsGridProps {
  programs: PublicProgram[];
}

export function ProgramsGrid({ programs }: ProgramsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {programs.map((program) => (
        <ProgramCard key={program.id} program={program} />
      ))}
    </div>
  );
}


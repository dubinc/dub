"use client";

import { PublicProgram } from "@/lib/fetchers/get-public-programs";
import Link from "next/link";

interface ProgramCardProps {
  program: PublicProgram;
}

export function ProgramCard({ program }: ProgramCardProps) {
  return (
    <Link
      href={`/${program.slug}`}
      className="group block rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-md"
    >
      <div className="mb-4 flex items-center justify-center">
        {program.wordmark || program.logo ? (
          <img
            className="max-h-12 max-w-full object-contain"
            src={(program.wordmark ?? program.logo) as string}
            alt={program.name}
            loading="lazy"
          />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-md text-lg font-semibold text-white"
            style={{
              backgroundColor: program.brandColor || "#000000",
            }}
          >
            {program.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700">
        {program.name}
      </h3>

      {program.url && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-1">
          {program.url.replace(/^https?:\/\//, "")}
        </p>
      )}
    </Link>
  );
}


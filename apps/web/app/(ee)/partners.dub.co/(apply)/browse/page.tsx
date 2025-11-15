import { getPublicPrograms } from "@/lib/fetchers/get-public-programs";
import { Metadata } from "next";
import { BrowseHeader } from "./header";
import { ProgramsGrid } from "./programs-grid";

export const metadata: Metadata = {
  title: "Browse Partner Programs | Dub Partners",
  description: "Discover and explore available partner programs on Dub.",
};

export default async function BrowsePage() {
  let programs: Awaited<ReturnType<typeof getPublicPrograms>> = [];
  let hasError = false;

  try {
    programs = await getPublicPrograms();
  } catch (error) {
    // Log error server-side without exposing sensitive details
    console.error("Failed to fetch public programs:", error instanceof Error ? error.message : "Unknown error");
    hasError = true;
    // Fallback to empty array to prevent SSR crash
    programs = [];
  }

  return (
    <div className="min-h-screen bg-white">
      <BrowseHeader />
      <main className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Partner Programs
          </h1>
          <p className="mt-2 text-gray-600">
            Explore available partner programs and collaborations
          </p>
        </div>

        {hasError ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">
              Unable to load partner programs at this time. Please try again later.
            </p>
          </div>
        ) : programs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No partner programs available at this time.</p>
          </div>
        ) : (
          <ProgramsGrid programs={programs} />
        )}
      </main>
    </div>
  );
}


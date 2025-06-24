"use client";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-xl px-4 py-16 md:px-6 lg:px-8">
        <h1 className="mb-2 text-2xl font-semibold leading-8 text-neutral-900">
          Connecting Dub
        </h1>

        {children}
      </main>
    </div>
  );
}

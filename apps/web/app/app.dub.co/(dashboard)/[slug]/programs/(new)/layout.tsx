import RootProviders from "app/providers";
import { Header } from "./new/header";
import { Steps } from "./new/steps";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)]">
        <Steps />
        <main className="px-4 py-6 md:px-8">
          <RootProviders>{children}</RootProviders>
        </main>
      </div>
    </div>
  );
}

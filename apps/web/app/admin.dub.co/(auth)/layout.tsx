import { Background } from "@dub/ui";
import Providers from "app/app.dub.co/(dashboard)/providers";

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <Background />
      <div className="relative z-10 flex flex-col items-center justify-center">
        {children}
      </div>
    </Providers>
  );
}

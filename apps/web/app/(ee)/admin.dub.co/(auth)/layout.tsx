import { Background } from "@dub/ui";

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Background />
      <div className="relative z-10 flex flex-col items-center justify-center">
        {children}
      </div>
    </>
  );
}

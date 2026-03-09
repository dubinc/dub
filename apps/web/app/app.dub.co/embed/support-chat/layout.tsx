export default function SupportChatEmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style precedence="high">{`
        html, body { background: transparent !important; }
      `}</style>
      {children}
    </>
  );
}

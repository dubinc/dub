import { QRBuilderWrapper } from "./components/qr-builder-wrapper.tsx";
import { QrBuilderProvider } from "./context";

export const QRBuilderNew = () => {
  return (
    <QrBuilderProvider>
      <QRBuilderWrapper />
    </QrBuilderProvider>
  );
};

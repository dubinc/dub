import { QRBuilderWrapper } from "./components/qr-builder-wrapper.copm";
import { QrBuilderProvider } from "./context";

export const QRBuilderNew = () => {
  return (
    <QrBuilderProvider>
      <QRBuilderWrapper />
    </QrBuilderProvider>
  );
};

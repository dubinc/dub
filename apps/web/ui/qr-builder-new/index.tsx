import { QRBuilderWrapper } from "./components/qr-builder-wrapper.component";
import { QrBuilderProvider } from "./context";

export const QRBuilderNew = () => {
  return (
    <QrBuilderProvider>
      <QRBuilderWrapper />
    </QrBuilderProvider>
  );
};

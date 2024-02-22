import { Suspense } from "react";
import UnsubscribeForm from "./form";

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeForm />
    </Suspense>
  );
}

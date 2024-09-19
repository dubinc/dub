import { constructMetadata } from "@dub/utils";
import RegisterPageClient from "./page-client";

export const metadata = constructMetadata({
  title: `Create your ${process.env.NEXT_PUBLIC_APP_NAME} account`,
});

export default function RegisterPage() {
  return <RegisterPageClient />;
}

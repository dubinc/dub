import { IntegrationGuide } from "./types";

export function Guide({ guide }: { guide: IntegrationGuide }) {
  return <>{guide.title}</>;
}

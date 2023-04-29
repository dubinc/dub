import { default as BelatedWelcomeEmail } from "../BelatedWelcome";
import { default as FeatureUpdatesEmail } from "../FeatureUpdates";
import { default as BigUpdatesEmail } from "../BigUpdates";

export function BelatedWelcome() {
  return <BelatedWelcomeEmail />;
}

export function FeatureUpdates() {
  return <FeatureUpdatesEmail />;
}

export function BigUpdates() {
  return <BigUpdatesEmail slug={"steven"} />;
}

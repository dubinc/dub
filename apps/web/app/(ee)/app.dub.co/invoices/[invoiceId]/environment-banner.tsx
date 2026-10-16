import { capitalize } from "@dub/utils";
import { WorkspaceEnvironment } from "@prisma/client";
import { Image, Text, View } from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";

const tw = createTw({});

export function InvoiceEnvironmentBanner({
  environment,
}: {
  environment: WorkspaceEnvironment;
}) {
  if (environment === "production") {
    return null;
  }

  return (
    <View
      style={tw(
        `mb-4 flex-row items-center justify-between rounded-lg px-4 py-2 ${
          environment === "staging" ? "bg-amber-200" : "bg-blue-200"
        }`,
      )}
    >
      <View style={tw("flex-row items-center")}>
        <Image
          src="https://assets.dub.co/misc/icons/nucleo/isolated-cube.png"
          style={tw("h-4 w-4")}
        />
        <Text style={tw("ml-1.5 text-sm font-semibold text-neutral-800")}>
          {capitalize(environment)}
        </Text>
      </View>
      <Text style={tw("text-sm font-medium text-neutral-800")}>
        No real money or payouts in {environment}.
      </Text>
    </View>
  );
}

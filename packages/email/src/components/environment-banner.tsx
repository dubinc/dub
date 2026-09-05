import { capitalize } from "@dub/utils";
import { cn } from "@dub/utils/src";
import { Column, Img, Row, Section, Text } from "@react-email/components";
import { WorkspaceEnvironment } from "../types";

export function EnvironmentBanner({
  environment = "production",
}: {
  environment?: WorkspaceEnvironment;
}) {
  if (environment === "production") {
    return null;
  }

  return (
    <Section
      className={cn(
        "mb-4 rounded-lg px-4 py-2",
        environment === "staging" ? "bg-amber-200" : "bg-blue-200",
      )}
    >
      <Row>
        <Column className="w-[140px]" valign="middle">
          <Row>
            <Column className="w-[20px]" valign="middle">
              <Img
                src="https://assets.dub.co/icons/isolated-cube.png"
                width="16"
                height="16"
                alt=""
                className="block"
              />
            </Column>
            <Column valign="middle" className="pl-1.5">
              <Text className="m-0 text-sm font-semibold text-neutral-800">
                {capitalize(environment)}
              </Text>
            </Column>
          </Row>
        </Column>
        <Column valign="middle" align="right">
          <Text className="m-0 text-right text-sm font-medium text-neutral-800">
            No real money or payouts in {environment}.
          </Text>
        </Column>
      </Row>
    </Section>
  );
}

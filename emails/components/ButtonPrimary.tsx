import { MjmlButton } from "mjml-react";
import { black, grayLight, white } from "./theme";
import { borderBase, leadingTight, textSm } from "./theme";

export default function ButtonPrimary({
  link,
  uiText,
}: {
  link: string;
  uiText: string;
}): JSX.Element {
  return (
    <>
      <MjmlButton
        lineHeight={leadingTight}
        fontSize={textSm}
        fontWeight={600}
        height={32}
        align="left"
        href={link}
        backgroundColor={black}
        color={grayLight}
        borderRadius={borderBase}
        cssClass="light-mode"
      >
        {uiText}
      </MjmlButton>
      <MjmlButton
        lineHeight={leadingTight}
        fontSize={textSm}
        fontWeight={600}
        height={32}
        align="left"
        href={link}
        backgroundColor={white}
        color={black}
        borderRadius={borderBase}
        cssClass="dark-mode"
      >
        {uiText}
      </MjmlButton>
    </>
  );
}

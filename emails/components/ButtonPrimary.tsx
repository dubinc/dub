import { MjmlButton } from "mjml-react";
import { black, white, grayLight } from "./theme";
import { leadingTight, textSm, borderBase } from "./theme";

type ButtonPrimaryProps = {
  link: string;
  uiText: string;
};

const ButtonPrimary: React.FC<ButtonPrimaryProps> = ({ link, uiText }) => {
  return (
    <MjmlButton href={link} cssClass="button">
      {uiText}
    </MjmlButton>
  );
};

export default ButtonPrimary;

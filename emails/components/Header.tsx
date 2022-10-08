import { MjmlSection, MjmlColumn, MjmlImage, MjmlText } from "mjml-react";

const Header = ({ title }: { title: string }) => {
  return (
    <MjmlSection>
      <MjmlColumn>
        <MjmlImage
          padding="32px 0"
          width="44px"
          height="44px"
          align="center"
          src="https://dub.sh/static/logo.png"
          cssClass="logo"
        />
        <MjmlText cssClass="title" align="center">
          {title}
        </MjmlText>
      </MjmlColumn>
    </MjmlSection>
  );
};

export default Header;

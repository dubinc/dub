import { MjmlColumn, MjmlImage, MjmlSection, MjmlText } from "mjml-react";

export default function Header({ title }: { title: string }): JSX.Element {
  return (
    <MjmlSection>
      <MjmlColumn>
        <MjmlImage
          padding="12px 0 24px"
          width="44px"
          height="44px"
          align="center"
          src="https://dub.sh/_static/logo.png"
          cssClass="logo"
        />
        <MjmlText cssClass="title" align="center">
          {title}
        </MjmlText>
      </MjmlColumn>
    </MjmlSection>
  );
}

const DUB_FLOATING_BUTTON_ID = "dub-floating-button";

const FLOATING_BUTTON_STYLES: Partial<CSSStyleDeclaration> = {
  margin: "0 16px 16px 0",
  backgroundColor: "#171717",
  color: "#fafafa",
  padding: "12px",
  borderRadius: "9999px",
  border: "none",
  transition: "transform 0.1s ease-in-out",
  pointerEvents: "auto",
};

export const createFloatingButton = ({
  container,
  buttonStyles,
  onClick,
}: {
  container: HTMLElement;
  buttonStyles?: Record<string, any>;
  onClick: () => void;
}): void => {
  const button = document.createElement("button");
  button.id = DUB_FLOATING_BUTTON_ID;
  Object.assign(button.style, {
    ...FLOATING_BUTTON_STYLES,
    ...buttonStyles,
  });

  button.innerHTML = giftIcon;

  button.addEventListener("click", () => onClick());

  // TODO: Figure out if we can use Tailwind classes for these states,
  //       or at least make them easily overrideable
  button.addEventListener(
    "mouseenter",
    () => (button.style.transform = "scale(1.1)"),
  );
  button.addEventListener(
    "mouseleave",
    () => (button.style.transform = "scale(1)"),
  );
  button.addEventListener(
    "pointerdown",
    () => (button.style.transform = "scale(0.95)"),
  );
  button.addEventListener(
    "pointerup",
    () => (button.style.transform = "scale(1.1)"),
  );

  container.appendChild(button);
};

const giftIcon =
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">` +
  `<g fill="currentColor">` +
  `<path d="M3,9.5v4.75c0,1.517,1.233,2.75,2.75,2.75h2.5v-7.5H3Z" />` +
  `<path d="M9.75,9.5v7.5h2.5c1.517,0,2.75-1.233,2.75-2.75v-4.75h-5.25Z" />` +
  `<path d="M15.25,4.5h-.462c.135-.307,.212-.644,.212-1,0-1.378-1.121-2.5-2.5-2.5-1.761,` +
  `0-2.864,1.231-3.5,2.339-.636-1.107-1.739-2.339-3.5-2.339-1.379,0-2.5,1.122-2.5,2.5,0,` +
  `.356,.077,.693,.212,1h-.462c-.965,0-1.75,.776-1.75,1.75s.785,1.75,1.75,1.75H15.25c.965,0` +
  `,1.75-.782,1.75-1.75s-.785-1.75-1.75-1.75Zm-2.75-2c.552,0,1,.449,1,1s-.448,1-1,1h-2.419c.405` +
  `-.86,1.176-2,2.419-2ZM4.5,3.5c0-.551,.448-1,1-1,1.234,0,2.007,1.14,2.415,2h-2.415c-.552,0-1-.449-1-1Z" />` +
  `</g>` +
  `</svg>`;

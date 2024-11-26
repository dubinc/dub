import { DUB_FLOATING_BUTTON_ID, GIFT_ICON } from "./constants";
import { DubFloatingButtonPlacement } from "./types";

const FLOATING_BUTTON_STYLES = (
  buttonPlacement: DubFloatingButtonPlacement,
): Partial<CSSStyleDeclaration> => ({
  margin: "16px",
  backgroundColor: "#171717",
  color: "#fafafa",
  padding: "12px",
  borderRadius: "9999px",
  border: "none",
  transition: "transform 0.1s ease-in-out",
  position: "fixed",
  ...{
    "top-left": {
      top: "0",
      left: "0",
    },
    "top-right": {
      top: "0",
      right: "0",
    },
    "bottom-left": {
      bottom: "0",
      left: "0",
    },
    "bottom-right": {
      bottom: "0",
      right: "0",
    },
  }[buttonPlacement],
  zIndex: "9997",
});

export const createFloatingButton = ({
  prefix,
  buttonStyles,
  buttonPlacement,
  onClick,
}: {
  prefix?: string;
  buttonStyles?: Record<string, any>;
  buttonPlacement: DubFloatingButtonPlacement;
  onClick: () => void;
}): void => {
  const button = document.createElement("button");
  button.id = `${prefix}${DUB_FLOATING_BUTTON_ID}`;
  Object.assign(button.style, {
    ...FLOATING_BUTTON_STYLES(buttonPlacement),
    ...buttonStyles,
  });

  button.innerHTML = GIFT_ICON;

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

  document.body.appendChild(button);
};

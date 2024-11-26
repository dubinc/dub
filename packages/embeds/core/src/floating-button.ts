import { GIFT_ICON } from "./constants";
import { DubWidgetPlacement } from "./types";

const DUB_FLOATING_BUTTON_ID = "dub-floating-button";

const FLOATING_BUTTON_STYLES = (
  placement: DubWidgetPlacement,
): Partial<CSSStyleDeclaration> => ({
  margin: "16px",
  ...{
    "bottom-right": { marginTop: "0" },
    "bottom-left": { marginTop: "0" },
    "top-right": { marginBottom: "0" },
    "top-left": { marginBottom: "0" },
    center: {},
  }[placement],
  backgroundColor: "#171717",
  color: "#fafafa",
  padding: "12px",
  borderRadius: "9999px",
  border: "none",
  transition: "transform 0.1s ease-in-out",
  pointerEvents: "auto",
});

export const createFloatingButton = ({
  prefix,
  container,
  buttonStyles,
  placement,
  onClick,
}: {
  prefix?: string;
  container: HTMLElement;
  buttonStyles?: Record<string, any>;
  placement: DubWidgetPlacement;
  onClick: () => void;
}): void => {
  const button = document.createElement("button");
  button.id = `${prefix}${DUB_FLOATING_BUTTON_ID}`;
  Object.assign(button.style, {
    ...FLOATING_BUTTON_STYLES(placement),
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

  container.appendChild(button);
};

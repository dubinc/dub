import { ComponentProps, ComponentType, SVGProps } from "react";

type VariantIcon = ComponentType<
  SVGProps<SVGSVGElement> & { variant?: "outline" | "fill" }
>;

export function withFillVariant(Icon: VariantIcon): VariantIcon {
  const FillIcon = (props: ComponentProps<VariantIcon>) => (
    <Icon variant="fill" {...props} />
  );
  FillIcon.displayName = `FillVariant(${Icon.displayName || Icon.name || "Icon"})`;
  return FillIcon;
}

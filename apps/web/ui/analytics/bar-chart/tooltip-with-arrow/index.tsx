import { TooltipInPortalProps } from "@visx/tooltip/lib/hooks/useTooltipInPortal";
import styles from "./tooltip.module.css";

type TooltipProps = {
  component: React.ComponentType<TooltipInPortalProps>;
};

type Props = React.PropsWithChildren<TooltipProps> & TooltipInPortalProps;

export default function TooltipWithArrow({
  component,
  children,
  ...restProps
}: Props) {
  const Component = component;
  return (
    <Component {...restProps} className={styles.tooltip}>
      {children}
    </Component>
  );
}

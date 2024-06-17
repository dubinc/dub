import { CSSProperties } from "react";

interface IconMenuProps {
  text?: string;
  icon: JSX.Element;
  style?: CSSProperties;
}

function IconMenu(props: IconMenuProps) {
  const { text, icon, style } = props;
  return (
    <div className={`flex items-center ${text ? "gap-1.5" : ""}`} style={style}>
      {icon}
      {text && <span className="text-xs">{text}</span>}
    </div>
  );
}

export default IconMenu;

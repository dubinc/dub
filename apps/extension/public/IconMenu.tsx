import React, { CSSProperties } from "react";

interface IconMenuProps {
  text?: string;
  icon: JSX.Element;
  style?: CSSProperties;
}

const IconMenu: React.FC<IconMenuProps> = ({ text, icon, style }) => {
  return (
    <div className={`flex items-center ${text ? "gap-1.5" : ""}`} style={style}>
      {icon}
      {text && <span className="text-xs">{text}</span>}
    </div>
  );
};

export default IconMenu;

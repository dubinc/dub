import React from "react";

interface IconMenuProps {
  text?: string;
  icon: JSX.Element;
}

const IconMenu: React.FC<IconMenuProps> = ({ text, icon }) => {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-xs">{text}</span>
    </div>
  );
};

export default IconMenu;

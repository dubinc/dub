import React from "react";

const ClickIcon: React.FC = () => {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      href={`https://dub.sh/stats/5CclIuC`}
    >
      <svg
        fill="none"
        shapeRendering="geometricPrecision"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        className="h-4 w-4"
      >
        <path d="M12 20V10"></path>
        <path d="M18 20V4"></path>
        <path d="M6 20v-4"></path>
      </svg>
    </a>
  );
};

export default ClickIcon;

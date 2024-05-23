import React from "react";

interface SwitchProps {
  checked: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange }) => {
  return (
    <div className="relative inline-block h-6 w-12">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
        id="toggleSwitch"
      />
      <label
        htmlFor="toggleSwitch"
        className={`block h-full w-full cursor-pointer rounded-full transition-colors duration-300 ${
          checked ? "bg-black" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        ></span>
      </label>
    </div>
  );
};

export default Switch;

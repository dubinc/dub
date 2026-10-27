import { type ChangeEvent, type KeyboardEvent } from "react";

export const handleMoneyKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
  // Allow: backspace, delete, tab, escape, enter, decimal point, and CMD/CTRL+A
  if (
    e.key === "Backspace" ||
    e.key === "Delete" ||
    e.key === "Tab" ||
    e.key === "Escape" ||
    e.key === "Enter" ||
    e.key === "ArrowLeft" ||
    e.key === "ArrowRight" ||
    e.key === "ArrowUp" ||
    e.key === "ArrowDown" ||
    (e.key === "." && !e.currentTarget.value.includes(".")) ||
    (e.key === "a" && (e.metaKey || e.ctrlKey)) // Allow CMD+A or CTRL+A
  ) {
    return;
  }

  // Ensure that it is a number and stop the keypress
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
};

export const handleMoneyInputChange = (e: ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;

  // If the new value is empty, allow it
  if (value === "") {
    return;
  }

  // If we have a single decimal point, ensure it's not the first character
  if (value === ".") {
    e.target.value = "0.";
    return;
  }

  // Remove leading zeros unless it's a decimal number between 0 and 1
  if (value.length > 1 && value[0] === "0" && value[1] !== ".") {
    e.target.value = value.replace(/^0+/, "");
    return;
  }

  // Limit to 2 decimal places
  const parts = value.split(".");
  if (parts[1]?.length > 2) {
    e.target.value = `${parts[0]}.${parts[1].slice(0, 2)}`;
  }
};

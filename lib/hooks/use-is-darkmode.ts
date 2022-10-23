import { useEffect, useState } from "react";

export default function useIsDarkmode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (document.documentElement.classList.contains("dark")) setIsDark(true);
    else setIsDark(false);
  }, []);
  return isDark;
}

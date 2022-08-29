import { useState, useEffect } from "react";

export default function VercelEdgeFunctions() {
  const [vercelFontColor, setVercelFontColor] = useState(
    "from-blue-600 to-cyan-600"
  );

  const updateColor = () => {
    if (vercelFontColor === "from-blue-600 to-cyan-600") {
      setVercelFontColor("from-purple-600 to-pink-600");
    } else if (vercelFontColor === "from-purple-600 to-pink-600") {
      setVercelFontColor("from-amber-600 to-yellow-600");
    } else {
      setVercelFontColor("from-blue-600 to-cyan-600");
    }
  };

  useEffect(() => {
    const interval = setInterval(() => updateColor(), 2000);
    return () => {
      clearInterval(interval);
    };
  }, [vercelFontColor]);

  return (
    <a
      className={`text-transparent bg-clip-text bg-gradient-to-r ${
        vercelFontColor || "from-blue-600 to-cyan-600"
      }`}
      href="https://vercel.com/edge"
      target="_blank"
      rel="noreferrer"
    >
      ▲ Vercel Edge Functions
    </a>
  );
}

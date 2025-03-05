import { useCallback, useEffect, useState } from "react";
import ReactDom from "react-dom";
import { DubEmbed } from "../embed";

const Embed = () => {
  const [token, setToken] = useState("");

  const createToken = useCallback(async () => {
    const res = await fetch("/api/create-token");
    const data = await res.json();
    setToken(data.token);
  }, []);

  useEffect(() => {
    createToken();
  }, []);

  return <DubEmbed data="referrals" token={token} />;
};

ReactDom.render(<Embed />, document.getElementById("root"));

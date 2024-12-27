import { useCallback, useEffect, useState } from "react";
import ReactDom from "react-dom";
import { DubWidget } from "../widget";

const Widget = () => {
  const [token, setToken] = useState("");

  const createToken = useCallback(async () => {
    const res = await fetch("/api/create-token");
    const data = await res.json();
    setToken(data.token);
  }, []);

  useEffect(() => {
    createToken();
  }, []);

  return <DubWidget token={token} />;
};

ReactDom.render(<Widget />, document.getElementById("root"));

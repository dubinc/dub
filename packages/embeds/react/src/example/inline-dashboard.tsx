import ReactDom from "react-dom";
import { DubDashboard } from "../dashboard";

const App = () => {
  return (
    <DubDashboard token="dub_embed_GHdbSOZBg5iyiuiOIsj0ZbQlAkstoQSrpc4s" />
  );
};

ReactDom.render(<App />, document.getElementById("root"));

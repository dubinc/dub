import ReactDom from "react-dom";
import { DubDashboard } from "../dashboard";

const Dashboard = () => {
  return (
    <DubDashboard token="dub_embed_GHdbSOZBg5iyiuiOIsj0ZbQlAkstoQSrpc4s" />
  );
};

ReactDom.render(<Dashboard />, document.getElementById("root"));

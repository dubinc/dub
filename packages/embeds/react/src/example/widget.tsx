import ReactDom from "react-dom";
import { DubWidget } from "../widget";

const Widget = () => {
  return <DubWidget token="dub_embed_GHdbSOZBg5iyiuiOIsj0ZbQlAkstoQSrpc4s" />;
};

ReactDom.render(<Widget />, document.getElementById("root"));

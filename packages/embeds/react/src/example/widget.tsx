import ReactDom from "react-dom";
import { DubWidget } from "../widget";

const Widget = () => {
  return <DubWidget token="dub_embed_" />;
};

ReactDom.render(<Widget />, document.getElementById("root"));

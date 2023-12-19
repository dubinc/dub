
import * as linkify from "linkifyjs";
//to convert links in comments clickable
export function LinkifyComments({ children }:{children:string}) {

  function renderText(comment: string) {
    console.log({comment})
    const extractedLinks = linkify.find(comment);
    const final = comment.split(/\s+/).flatMap((part, index) => {

        const foundLink = extractedLinks.find((link) => { return link.value === part })
        if (foundLink) {
            return [<a href={foundLink.href} key={index} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">{part}</a>, " "];
        }
        else {
            return [part, " "]
        }
    })
    return final
}

  return (
    <div>
    {renderText(children)}
    </div>
  );
}


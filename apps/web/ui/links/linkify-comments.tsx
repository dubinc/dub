
//to convert links in comments clickable
export default function LinkifyText({ children }:{children:string}) {
  const urlPattern = /(\bhttps?:\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;

  const renderText = (text:string) => {
    const parts = text.split(urlPattern);
    return parts.map((part, index) => {
      if (part.match(urlPattern)) {
        return <a href={part} key={index} target="_blank" rel="noopener noreferrer" className="hover:underline">{part}</a>;
      } else {
        return part;
      }
    });
  };

  return (
    <div>
      {renderText(children)}
    </div>
  );
}


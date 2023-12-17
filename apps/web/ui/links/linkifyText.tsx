export default function LinkifyText({ text }:{text:any}) {
  const urlPattern = /(\bhttps?:\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;

  const renderText = (text:any) => {
    const parts = text.split(urlPattern);
    return parts.map((part:any, index:any) => {
      if (part.match(urlPattern)) {
        return <a href={part} key={index} target="_blank" rel="noopener noreferrer" className="hover:underline">{part}</a>;
      } else {
        return part;
      }
    });
  };

  return (
    <div>
      {renderText(text)}
    </div>
  );
}


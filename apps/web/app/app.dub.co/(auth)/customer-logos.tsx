const CUSTOMER_LOGOS = [
  { name: "Framer", src: "https://assets.dub.co/clients/framer.svg" },
  { name: "Granola", src: "https://assets.dub.co/clients/granola.svg" },
  { name: "Buffer", src: "https://assets.dub.co/clients/buffer.svg" },
  { name: "Copper", src: "https://assets.dub.co/clients/copper.svg" },
  { name: "Perplexity", src: "https://assets.dub.co/clients/perplexity.svg" },
  { name: "Wisprflow", src: "https://assets.dub.co/clients/wisprflow.svg" },
];

export function CustomerLogos() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 px-8 pb-10 pt-6 opacity-80 grayscale lg:px-10">
      {CUSTOMER_LOGOS.map((logo) => (
        <img
          key={logo.name}
          src={logo.src}
          alt={logo.name}
          className="h-5 w-auto"
        />
      ))}
    </div>
  );
}

const HEADER_OFFSET = 65;

export const scrollToBuilder = () => {
  const qrGenerationBlock = document.getElementById("qr-generation-block");

  if (!qrGenerationBlock) {
    return;
  }

  const elementPosition = qrGenerationBlock.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - HEADER_OFFSET;


  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth"
  });
};

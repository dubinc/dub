export const fileToBase64 = (file: File) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;

      // const payload = {
      //   filename: file.name,
      //   mimeType: file.type,
      //   content: base64,
      // };

      resolve(base64);
    };

    reader.readAsDataURL(file);
  });
};

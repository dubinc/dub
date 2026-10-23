// a warm instance keeps each font, so that the next image skips the 2 requests
// to Google Fonts. Satori already keeps the images that it fetches.
const fontCache = new Map<string, Promise<ArrayBuffer | undefined>>();

export async function loadGoogleFont(font: string) {
  let fontPromise = fontCache.get(font);

  if (!fontPromise) {
    fontPromise = fetchGoogleFont(font);
    fontCache.set(font, fontPromise);
  }

  try {
    const data = await fontPromise;
    // try again on the next image if Google Fonts did not return the font
    if (!data) fontCache.delete(font);
    return data;
  } catch (error) {
    fontCache.delete(font);
    throw error;
  }
}

async function fetchGoogleFont(font: string) {
  const url = `https://fonts.googleapis.com/css2?family=${font}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(
    /src: url\((.+)\) format\('(opentype|truetype)'\)/,
  );

  if (resource) {
    const response = await fetch(resource[1]);
    if (response.status == 200) {
      return await response.arrayBuffer();
    }
  }
}

import {
  Config,
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";

export const generateRandomName = () => {
  const config: Config = {
    // given 1,400 adjectives, 50 colors, and 350 animals
    // we have 1,400 * 50 * 350 = 24,500,000 possible combinations
    dictionaries: [adjectives, colors, animals],
    separator: " ",
    style: "capital",
  };

  return uniqueNamesGenerator(config);
};

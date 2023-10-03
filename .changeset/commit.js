const { outdent } = require('outdent');

const getAddMessage = async (changeset, options) => {
  const skipCI = options?.skipCI === 'add' || options?.skipCI === true;
  return outdent`docs(changeset): ${changeset.summary} [PH-3428]${skipCI ? `\n\n[skip ci]\n` : ''}`;
};

const getVersionMessage = async (releasePlan, options) => {
  const skipCI = options?.skipCI === 'version' || options?.skipCI === true;
  const publishableReleases = releasePlan.releases.filter(release => release.type !== 'none');
  const numPackagesReleased = publishableReleases.length;

  const releasesLines = publishableReleases
    .map(release => `  ${release.name}@${release.newVersion}`)
    .join('\n');

  return outdent`
    chore: releasing ${numPackagesReleased} package(s) [PH-3428]
    Releases:
    ${releasesLines}
    ${skipCI ? `\n[skip ci]\n` : ''}
`;
};

module.exports = {
  getAddMessage,
  getVersionMessage
};

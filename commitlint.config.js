module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [1, 'always', 72],
    'body-max-line-length': [1, 'always', 256],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'impr'
      ]
    ],
    'subject-case': [1, 'always', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']]
  }
};

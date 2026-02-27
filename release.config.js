module.exports = {
  branches: ['master'],
  repositoryUrl: 'https://github.com/detiuaveiro/ies2526-group-project-g703',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    ['@semantic-release/npm', { npmPublish: false }], // set true if publishing to npm
    '@semantic-release/github'
  ]
};

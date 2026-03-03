module.exports = {
  branches: ['master'],
  // repositoryUrl is omitted to allow semantic-release to infer from git remote
  // (supports repo renames, transfers, and forks without manual updates)
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    ['@semantic-release/npm', { npmPublish: false }], // set true if publishing to npm
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md']
      }
    ],
    '@semantic-release/github'
  ]
};

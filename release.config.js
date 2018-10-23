module.exports = {
  verifyConditions: [
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/git',
    '@semantic-release/github',
  ],
  prepare: [
    '@semantic-release/changelog',
    '@semantic-release/npm',
    {
      path: '@semantic-release/git',
      message: `\
[<%= nextRelease.version %>]\
(https://github.com/fartts/superfluity/tree/<%= nextRelease.version%>)\
 - <%= new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
})%> [skip ci]
<%=nextRelease.gitTag%>
<%=nextRelease.gitHead%>
<%=nextRelease.notes%>`,
    },
  ],
  publish: ['@semantic-release/npm', '@semantic-release/github'],
  npmPublish: false,
  githubPr: {
    analyzeCommits: '@semantic-release/commit-analyzer',
    generateNotes: '@semantic-release/release-notes-generator',
  },
};

const algoliasearch = require('algoliasearch');

const client = algoliasearch(
  process.env.ALGOLIA_APPLICATION_ID,
  process.env.ALGOLIA_SEARCH_KEY,
);

const index = client.initIndex('messages');

module.exports = index;

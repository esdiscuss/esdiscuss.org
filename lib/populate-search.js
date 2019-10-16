const algoliasearch = require('algoliasearch');
const Q = require('q');
const db = require('./database');

if (process.env.ALGOLIA_APPLICATION_ID && process.env.ALGOLIA_ADMIN_KEY) {
  const client = algoliasearch(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_ADMIN_KEY);

  const index = client.initIndex('messages');
  Q(index.setSettings({"attributeForDistinct":"subjectID"})).done();

  // initially, we load in pages of 60 records, once per minute until we have looked at the most recent 100 records
  // we then check every hour to see if there are any new records, loading in pages of 5 until we get to the most
  // recent record we've seen.
  let perPage = 60;
  let latestMessage = '0000-00-00';
  let currentRoundLatestMessage = '0000-00-00';
  let roundComplete = false;
  function processPage(start) {
    if (roundComplete || start > 100) {
      latestMessage = currentRoundLatestMessage;
      roundComplete = false;
      return setTimeout(() => {
        perPage = 5;
        processPage(0);
      }, 60 * 60 * 1000);
    }
    db.getAllMessagesForSearch(start, perPage).done(messages => {
      messages.forEach(message => {
        const messageDate = message.date.toISOString().split('T')[0];
        // keep track of the newest message we've seen this round
        if (messageDate > currentRoundLatestMessage) {
          currentRoundLatestMessage = messageDate;
        }
        // if the message is older than the most recent message, end the round
        if (messageDate < latestMessage) {
          roundComplete = true;
        }
      });
      index.saveObjects(messages, (err) => {
        if (err) {
          throw err;
        }
        setTimeout(() => {
          processPage(start + perPage);
        }, 60000);
      });
    });
  }
  processPage(0);
}

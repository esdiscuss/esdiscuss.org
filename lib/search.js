const algoliasearch = require('algoliasearch');
const Q = require('q');
const db = require('./database');

if (process.env.ALGOLIA_APPLICATION_ID && process.env.ALGOLIA_ADMIN_KEY) {
  const client = algoliasearch(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_ADMIN_KEY);

  const index = client.initIndex('messages');
  Q(index.setSettings({"attributeForDistinct":"subjectID"})).done();

  /*
  db.getAllMessagesForSearch().done(messages => {
    index.saveObjects(messages, (err) => {
      if (err) {
        throw err;
      }
      console.log('Added ' + messages.length + ' messages to the index.');
    });
  });
  */
  const perPage = 5;
  let latestMessage = '0000-00-00';
  let currentRoundLatestMessage = '0000-00-00';
  let roundComplete = false;
  function processPage(start) {
    console.dir(start);
    if (roundComplete || start > 100) {
      latestMessage = currentRoundLatestMessage;
      roundComplete = false;
      return processPage(0);
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

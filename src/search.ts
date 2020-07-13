// const algoliasearch = require('algoliasearch');
// import * as db from './database';

// if (process.env.ALGOLIA_APPLICATION_ID && process.env.ALGOLIA_ADMIN_KEY) {
//   const client = algoliasearch(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_ADMIN_KEY);

//   const index = client.initIndex('messages');
//   index.setSettings({"attributeForDistinct":"subjectID"});

//   // initially, we load in pages of 60 records, once per minute until we have looked at the most recent 100 records
//   // we then check every 24 hours to see if there are any new records, loading in pages of 5 until we get to the most
//   // recent record we've seen.
//   let perPage = 60;
//   let latestMessage = '0000-00-00';
//   let currentRoundLatestMessage = '0000-00-00';
//   let roundComplete = false;
//   function processPage(start: number) {
//     if (roundComplete || start > 100 || (new Date()).toISOString().split('T')[0] < '') {
//       latestMessage = currentRoundLatestMessage;
//       roundComplete = false;
//       setTimeout(() => {
//         perPage = 5;
//         processPage(0);
//       }, 24 * 60 * 60_000);
//       return;
//     }
//     db.getAllMessagesForSearch(start, perPage).then(messages => {
//       messages.forEach(message => {
//         const messageDate = message.date.toISOString().split('T')[0];
//         // keep track of the newest message we've seen this round
//         if (messageDate > currentRoundLatestMessage) {
//           currentRoundLatestMessage = messageDate;
//         }
//         // if the message is older than the most recent message, end the round
//         if (messageDate < latestMessage) {
//           roundComplete = true;
//         }
//       });
//       index.saveObjects(messages, (err: any) => {
//         if (err) {
//           throw err;
//         }
//         setTimeout(() => {
//           processPage(start + perPage);
//         }, 20 * 60_000);
//       });
//     });
//   }
//   processPage(0);
// }

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const algoliasearch = require('algoliasearch');
const db = __importStar(require("./database"));
if (process.env.ALGOLIA_APPLICATION_ID && process.env.ALGOLIA_ADMIN_KEY) {
    const client = algoliasearch(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_ADMIN_KEY);
    const index = client.initIndex('messages');
    index.setSettings({ "attributeForDistinct": "subjectID" });
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
            setTimeout(() => {
                perPage = 5;
                processPage(0);
            }, 60 * 60000);
            return;
        }
        db.getAllMessagesForSearch(start, perPage).then(messages => {
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
                }, 5 * 60000);
            });
        });
    }
    processPage(0);
}
//# sourceMappingURL=search.js.map
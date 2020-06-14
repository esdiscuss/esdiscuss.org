"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopicFromMessageID = exports.getAllMessagesForSearch = exports.botRuns = exports.page = exports.getNewLocation = exports.topic = exports.location = exports.fromURL = exports.history = exports.update = exports.message = exports.user = void 0;
const crypto_1 = require("crypto");
const moment_1 = __importDefault(require("moment"));
var mongo = require('then-mongo');
const process_1 = require("./process");
var MONGO_USER = process.env.MONGO_USER || 'read';
var MONGO_PASS = process.env.MONGO_PASS || 'read';
var db = mongo(MONGO_USER + ':' + MONGO_PASS + '@ds039912-a0.mongolab.com:39912,ds039912-a1.mongolab.com:39912/esdiscuss-new?replicaSet=rs-ds039912', ['topics', 'headers', 'contents', 'history', 'log', 'runsPerDay']);
async function user(email) {
    var hash = crypto_1.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
    var user = {
        email: email,
        hash: hash,
        avatar: avatar(hash),
        profile: profile(hash)
    };
    return user;
}
exports.user = user;
async function message(id) {
    const [message, content] = await Promise.all([db.headers.findOne({ _id: id }), db.contents.findOne({ _id: id })]);
    if (!message)
        return null;
    const hash = crypto_1.createHash('md5').update(message.from.email.toLowerCase().trim()).digest('hex');
    return {
        ...message,
        from: { ...message.from, hash, avatar: avatar(hash), profile: profile(hash) },
        edited: content.edited || process_1.processMessage(content.content),
        original: content.content,
    };
}
exports.message = message;
;
async function update(id, content, email) {
    var now = new Date();
    await db.history.insert({ _id: now.toISOString(), id: id, date: now, user: email, content: content }, { safe: true });
    await Promise.all([
        new Promise((resolve, reject) => {
            db.contents.update({ _id: id }, { '$set': { updated: now, edited: content } }, function (err) {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        }),
        new Promise((resolve, reject) => {
            db.headers.update({ _id: id }, { '$set': { updated: now } }, function (err) {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        })
    ]);
}
exports.update = update;
;
async function history(id) {
    const [original, edits,] = await Promise.all([
        message(id),
        db.history.find({ id: id }).sort({ 'date': 1 }).then(edits => Promise.all(edits.map(async (e) => {
            const from = await user(e.user);
            return { ...e, from };
        }))),
    ]);
    return { original, edits };
}
exports.history = history;
async function fromURL(url) {
    const res = await db.headers.find({ url: url });
    return res[0] || null;
}
exports.fromURL = fromURL;
;
async function location(subjectID, date) {
    const [subjectSlug, messageNum] = await Promise.all([
        db.topics.findOne({ subjectID: subjectID }).then((res) => res._id),
        db.headers.count({ 'subjectID': subjectID, 'date': { '$lt': date } }),
    ]);
    return { subjectID: subjectSlug, messageNum };
}
exports.location = location;
async function topic(topicSlug) {
    const res = await db.topics.findOne({ _id: topicSlug });
    if (!res) {
        return [];
    }
    const [headers, contents] = await Promise.all([
        db.headers.find({ subjectID: res.subjectID }).sort({ date: 1 }),
        db.contents.find({ subjectID: res.subjectID }),
    ]);
    return headers.map((message) => {
        const hash = crypto_1.createHash('md5').update(message.from.email.toLowerCase().trim()).digest('hex');
        const c = contents.find((m) => m._id === message._id);
        return {
            ...message,
            from: {
                ...message.from,
                hash,
                avatar: avatar(hash),
                profile: profile(hash),
            },
            edited: c.edited || process_1.processMessage(c.content),
            original: c.content,
            updated: message.updated || c.updated,
        };
    });
}
exports.topic = topic;
async function getNewLocation(oldSubjectID) {
    const topic = await db.topics.findOne({ subjectID: oldSubjectID });
    return topic && topic._id;
}
exports.getNewLocation = getNewLocation;
function avatar(hash) {
    return 'https://secure.gravatar.com/avatar/' + hash + '?s=200&d=mm';
}
function profile(hash) {
    return 'http://www.gravatar.com/' + hash;
}
//sample topic
/*
[ { from: { email: 'nrubin@nvidia.com', name: 'Norm Rubin' },
    date: Fri Apr 05 2013 13:54:26 GMT+0100 (GMT Summer Time),
    subject: 'another rivertrail question',
    messageID: '<A4DCC42E2B5835498682FCB0A8F9F8733787065E70@HQMAIL04.nvidia.com>',
    _id: '2013-04/A4DCC42E2B5835498682FCB0A8F9F8733787065E70@HQMAIL04.nvidia.com',
    subjectID: 'anotherrivertrailquestion',
    month: '2013-04',
    id: 'A4DCC42E2B5835498682FCB0A8F9F8733787065E70@HQMAIL04.nvidia.com' },
  { from: { email: 'rick.hudson@intel.com', name: 'Hudson, Rick' },
    date: Fri Apr 05 2013 18:19:59 GMT+0100 (GMT Summer Time),
    subject: 'another rivertrail question',
    inReplyTo: '<A4DCC42E2B5835498682FCB0A8F9F8733787065E70@HQMAIL04.nvidia.com>',
    references: '<A4DCC42E2B5835498682FCB0A8F9F8733787065E70@HQMAIL04.nvidia.com>',
    messageID: '<7B9BA3214DBE2B42AE93AE882BD001960F41400F@fmsmsx110.amr.corp.intel.com>',
    _id: '2013-04/7B9BA3214DBE2B42AE93AE882BD001960F41400F@fmsmsx110.amr.corp.intel.com',
    subjectID: 'anotherrivertrailquestion',
    month: '2013-04',
    id: '7B9BA3214DBE2B42AE93AE882BD001960F41400F@fmsmsx110.amr.corp.intel.com' }]
*/
async function page(page, numberPerPage = 20) {
    const res = db.topics.find().sort({ end: -1 }).skip(page * numberPerPage).limit(numberPerPage + 1);
    const last = res.length < numberPerPage + 1;
    if (!last)
        res.pop();
    return Object.assign(res.map((topic) => ({
        ...topic,
        start: moment_1.default(topic.start),
        end: moment_1.default(topic.end)
    })), { last });
}
exports.page = page;
//sample page
/*
[ { _id: 'anotherrivertrailquestion',
    subject: 'another rivertrail question',
    messages: 2,
    first: { email: 'nrubin@nvidia.com', name: 'Norm Rubin' },
    last: { email: 'rick.hudson@intel.com', name: 'Hudson, Rick' },
    start: Fri Apr 05 2013 13:54:26 GMT+0100 (GMT Summer Time),
    end: Fri Apr 05 2013 18:19:59 GMT+0100 (GMT Summer Time) },
  { _id: 'howtosubmitaproposalfocmascript',
    subject: 'how to submit a proposal for ECMAScript 7?',
    messages: 2,
    first: { email: 'ohad.assulin@hp.com', name: 'Assulin, Ohad' },
    last: { email: 'bruant.d@gmail.com', name: 'David Bruant' },
    start: Fri Apr 05 2013 11:00:10 GMT+0100 (GMT Summer Time),
    end: Fri Apr 05 2013 11:27:37 GMT+0100 (GMT Summer Time) },

  last: false
]
*/
async function botRuns() {
    const days = await db.runsPerDay.find();
    return days.sort((a, b) => a._id < b._id ? -1 : 1);
}
exports.botRuns = botRuns;
;
// TODO: fetch the 10 records once every 10 minutes
exports.getAllMessagesForSearch = async function (start, limit) {
    const headers = await db.headers.find().sort({ date: -1 }).skip(start).limit(limit);
    return Promise.all(headers.map(header => {
        return db.contents.findOne({ _id: header._id }).then(content => {
            return {
                objectID: header._id,
                subject: header.subject,
                content: content.content.substr(0, 5000),
                fromName: header.from.name,
                fromEmail: header.from.email,
                date: header.date,
                subjectID: header.subjectID,
            };
        });
    }));
};
async function getTopicFromMessageID(messageID) {
    const header = await db.headers.findOne({ _id: messageID });
    const topic = await db.topics.findOne({ subjectID: header.subjectID });
    return topic._id;
}
exports.getTopicFromMessageID = getTopicFromMessageID;
//# sourceMappingURL=database.js.map
import {createHash} from 'crypto';
import moment from 'moment';
var mongo = require('then-mongo');

import {processMessage} from './process';

var MONGO_USER = process.env.MONGO_USER || 'read'
var MONGO_PASS = process.env.MONGO_PASS || 'read'
var db = mongo(MONGO_USER + ':' + MONGO_PASS + '@ds039912-a0.mongolab.com:39912,ds039912-a1.mongolab.com:39912/esdiscuss-new?replicaSet=rs-ds039912',
  ['topics', 'headers', 'contents', 'history', 'log', 'runsPerDay'])

declare class Brand<Name> {private readonly __brand: Name}
export type MessageID = string & Brand<'MessageID'>;
export type TopicKey = string & Brand<'TopicKey'>;
export type TopicSlug = string & Brand<'TopicSlug'>;

interface Header {
  _id: MessageID;
  subject: string;
  from: {
    name: string;
    email: string;
  },
  reply: string;
  date: Date;
  subjectID: TopicKey;
  url: string;
  updated?: Date;
}

interface Message extends Header {
  from: {
    name: string;
    email: string;

    hash: string;
    avatar: string;
    profile: string;
  },
  edited: string;
  original: string;
  updated?: Date;
}

interface Content {
  _id: MessageID;
  edited?: string;
  updated?: Date;
  content: string;
}
interface HistoryEntry {
  id: MessageID;
  user: string;
}
interface Topic {
  _id: TopicSlug;
  subjectID: TopicKey;
  start: Date;
  end: Date;
}

interface BotRunsDay {
  _id: string;
  runs: number;
}

export async function user(email: string) {
  var hash = createHash('md5').update(email.toLowerCase().trim()).digest('hex')
  var user = {
    email: email,
    hash: hash,
    avatar: avatar(hash),
    profile: profile(hash)
  }
  return user;
}
export async function message(id: MessageID): Promise<Message | null> {
  const [message, content]: [Header, Content] = await Promise.all([db.headers.findOne({_id: id}), db.contents.findOne({_id: id})]);
  if (!message) return null
  const hash = createHash('md5').update(message.from.email.toLowerCase().trim()).digest('hex');
  return {
    ...message,
    from: {...message.from, hash, avatar: avatar(hash), profile: profile(hash)},
    edited: content.edited || processMessage(content.content),
    original: content.content,
  }
};

export async function update(id: MessageID, content: string, email: string): Promise<void> {
  var now = new Date()
  await db.history.insert({_id: now.toISOString(), id: id, date: now, user: email, content: content}, {safe: true});
  await Promise.all([
    new Promise((resolve, reject) => {
      db.contents.update({_id: id}, {'$set': { updated: now, edited: content } }, function (err: Error | null) {
        if (err) reject(err)
        else resolve()
      })
    }),
    new Promise((resolve, reject) => {
      db.headers.update({_id: id}, {'$set': { updated: now } }, function (err: Error | null) {
        if (err) reject(err)
        else resolve()
      })
    })
  ]);
};

export async function history(id: MessageID) {
  const [
    original,
    edits,
  ] = await Promise.all([
    message(id),
    (db.history.find({id: id}).sort({'date':1}) as Promise<HistoryEntry[]>).then(edits => Promise.all(
      edits.map(async (e) => {
        const from = await user(e.user);
        return {...e, from};
      })
    )),
  ]);
  return {original, edits};
}

export async function fromURL(url: string): Promise<Header | null> {
  const res = await db.headers.find({url: url});
  return res[0] || null;
};

export async function location(subjectID: string, date: Date) {
  const [
    subjectSlug,
    messageNum
  ] = await Promise.all([
    (db.topics.findOne({subjectID: subjectID}) as Promise<Topic>).then((res) => res._id),
    (db.headers.count({ 'subjectID': subjectID, 'date': {'$lt': date} }) as Promise<number>),
  ])
  return {subjectID: subjectSlug, messageNum};
}

export async function topic(topicSlug: TopicSlug) {
  const res = await db.topics.findOne({_id: topicSlug});
  if (!res) {
    return []
  }
  const [headers, contents] = await Promise.all([
    db.headers.find({subjectID: res.subjectID}).sort({date: 1}) as Promise<Header[]>,
    db.contents.find({subjectID: res.subjectID}) as Promise<Content[]>,
  ])
  return headers.map((message): Message => {
    const hash = createHash('md5').update(message.from.email.toLowerCase().trim()).digest('hex');
    const c = contents.find((m) => m._id === message._id)!
    return {
      ...message,
      from: {
        ...message.from,
        hash,
        avatar: avatar(hash),
        profile: profile(hash),
      },
      edited: c.edited || processMessage(c.content),
      original: c.content,
      updated: message.updated || c.updated,
    }
  })
}
export async function getNewLocation(oldSubjectID: TopicKey): Promise<TopicSlug | null> {
  const topic: Topic | null = await db.topics.findOne({subjectID: oldSubjectID});
  return topic && topic._id;
}

function avatar(hash: string) {
  return 'https://secure.gravatar.com/avatar/' + hash + '?s=200&d=mm';
}
function profile(hash: string) {
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

export async function page(page: number, numberPerPage: number = 20): Promise<{
  start: moment.Moment;
  end: moment.Moment;
  _id: string;
  subjectID: string;
}[] & {
  last: boolean;
}> {
  const res: Topic[] = await db.topics.find().sort({end: -1}).skip(page * numberPerPage).limit(numberPerPage + 1);

  const last = res.length < numberPerPage + 1;
  if (!last) res.pop();

  return Object.assign(res.map((topic)  => ({
    ...topic,
    start: moment(topic.start),
    end: moment(topic.end)
  })), {last});
}

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

export async function botRuns() {
  const days: BotRunsDay[] = await db.runsPerDay.find();
  return days.sort((a, b) => a._id < b._id ? -1 : 1);
};

// TODO: fetch the 10 records once every 10 minutes
export const getAllMessagesForSearch = async function (start: number, limit: number) {
  const headers: Header[] = await db.headers.find().sort({date: -1}).skip(start).limit(limit);
  return Promise.all(headers.map(header => {
    return (db.contents.findOne({_id: header._id}) as Promise<Content>).then(content => {
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

export async function getTopicFromMessageID(messageID: MessageID): Promise<TopicSlug> {
  const header = await db.headers.findOne({_id: messageID});
  const topic = await db.topics.findOne({subjectID: header.subjectID});
  return topic._id;
}

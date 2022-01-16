import createConnectionPool, {sql} from '@databases/pg';
import {createHash} from 'crypto';
import moment from 'moment';

import {processMessage} from './process';

const DB_SOCKET_PATH = process.env.DB_SOCKET_PATH || `/cloudsql`
const DB_USER = process.env.DB_USER!
const DB_PASSWORD = process.env.DB_PASSWORD!
const DB_NAME = process.env.DB_NAME!
const CLOUD_SQL_CONNECTION_NAME = process.env.CLOUD_SQL_CONNECTION_NAME!

const db = createConnectionPool({
  host: `${DB_SOCKET_PATH}/${CLOUD_SQL_CONNECTION_NAME}`,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
})

declare class Brand<Name> {private readonly __brand: Name}
export type MessageKey = string & Brand<'MessageKey'>;
export type TopicKey = string & Brand<'TopicKey'>;
export type TopicSlug = string & Brand<'TopicSlug'>;

interface Message {
  _id: MessageKey;
  subject: string;
  reply: string;
  date: Date;
  subjectID: TopicKey;
  url: string;
  from: {
    name: string;
    email: string;

    hash: string;
    avatar: string;
    profile: string;
  },
  edited: string;
  original: string;
  updated?: Date | null;
}

interface HistoryEntry {
  user: string;
  content: string;
  date: Date;
}
interface Topic {
  _id: TopicSlug;
  subjectID: TopicKey;
  start: Date;
  end: Date;

  subject: string;
  first: {name: string; email: string;}
  messages: number;
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
export async function message(id: MessageKey): Promise<Message | null> {
  const messages: {
    _id: MessageKey,
    subject: string,
    from_name: string,
    from_email: string,
    reply: string,
    date: Date,
    subjectID: TopicKey,
    url: string,
    updated: Date | null,
    edited: string | null,
    original: string,
  }[] = await db.query(sql`
    SELECT
      m.message_key AS "_id",
      t.topic_name AS "subject",
      m.from_name,
      m.from_email,
      m.reply,
      m.sent_at AS "date",
      t.topic_key AS "subjectID",
      m.source_url AS "url",
      m.edited_at AS "updated",
      m.edited_content AS "edited",
      m.original_content AS "original"
    FROM
      messages m
      INNER JOIN topics t ON t.id = m.topic_id
    WHERE
      m.message_key = ${id}
  `);
  if (!messages.length) return null
  const {from_email, from_name, ...message} = messages[0];
  const hash = createHash('md5').update(from_email.toLowerCase().trim()).digest('hex');
  return {
    ...message,
    from: {email: from_email, name: from_name, hash, avatar: avatar(hash), profile: profile(hash)},
    edited: message.edited || processMessage(message.original),
  }
};

export async function update(id: MessageKey, content: string, email: string): Promise<void> {
  var now = new Date()
  await db.tx(async (db) => {
    await db.query(sql`
      INSERT INTO message_history (message_id, user_name, content, created_at)
      VALUES (SELECT id FROM messages m WHERE m.message_key = ${id}, ${email}, ${content}, ${now});
    `);
    await db.query(sql`
      UPDATE messages
      SET edited_content=${content}, edited_at=${now}
      WHERE message_key=${id}
    `);
  });
};

export async function history(id: MessageKey) {
  const [
    original,
    edits,
  ] = await Promise.all([
    message(id),
    (db.query(sql`
      SELECT
        h.user_name AS "user",
        h.created_at AS "date",
        h.content
      FROM
        message_history h
        INNER JOIN messages m ON m.id = h.message_id
      WHERE
        m.message_key = ${id}
      ORDER BY
	      h.created_at DESC;
    `) as Promise<HistoryEntry[]>).then(edits => Promise.all(
      edits.map(async (e) => {
        const from = await user(e.user);
        return {...e, from};
      })
    )),
  ]);
  return {original, edits};
}

export async function locationFromUrl(url: string) {
  const results: {topic_slug: TopicSlug; topic_id: number; sent_at: Date}[] = await db.query(sql`
    SELECT
      m.sent_at,
      t.id AS topic_id,
      t.topic_slug
    FROM
      messages m
      INNER JOIN topics t ON t.id = m.topic_id
    WHERE
      m.source_url = ${url};
  `);
  if (!results.length) return null;
  const {topic_slug, sent_at, topic_id} = results[0];
  const [{count}] = (await db.query(sql`
    SELECT
      count(*) AS count
    FROM
      messages m
    WHERE
      m.topic_id = ${topic_id}
      AND m.sent_at < ${sent_at}
  `) as [{count: number}]);
  return {topic_slug, messageNum: count};
};
export async function locationFromSearchKey(messageID: MessageKey) {
  const results: {topic_slug: TopicSlug; topic_id: number; sent_at: Date}[] = await db.query(sql`
    SELECT
      m.sent_at,
      t.id AS topic_id,
      t.topic_slug
    FROM
      messages m
      INNER JOIN topics t ON t.id = m.topic_id
    WHERE
      m.message_key = ${messageID};
  `);
  if (!results.length) return null;
  const {topic_slug, sent_at, topic_id} = results[0];
  const [{count}] = (await db.query(sql`
    SELECT
      count(*) AS count
    FROM
      messages m
    WHERE
      m.topic_id = ${topic_id}
      AND m.sent_at < ${sent_at}
  `) as [{count: number}]);
  return {topic_slug, messageNum: count};
}

export async function topic(topicSlug: TopicSlug) {
  const res: {
    _id: MessageKey,
    subject: string,
    from_name: string,
    from_email: string,
    reply: string,
    date: Date,
    subjectID: TopicKey,
    url: string,
    updated: Date | null,
    edited: string | null,
    original: string,
  }[] = await db.query(sql`
    SELECT
      m.message_key AS "_id",
      t.topic_name AS "subject",
      m.from_name,
      m.from_email,
      m.reply,
      m.sent_at AS "date",
      t.topic_key AS "subjectID",
      m.source_url AS "url",
      m.edited_at AS "updated",
      m.edited_content AS "edited",
      m.original_content AS "original"
    FROM
      messages m
      INNER JOIN topics t ON t.id = m.topic_id
    WHERE
      t.topic_slug = ${topicSlug}
    ORDER BY m.sent_at ASC
  `);
  return res.map(({from_email, from_name, ...message}): Message => {
    const hash = createHash('md5').update(from_email.toLowerCase().trim()).digest('hex');
    return {
      ...message,
      from: {
        email: from_email,
        name: from_name,
        hash,
        avatar: avatar(hash),
        profile: profile(hash),
      },
      edited: message.edited || processMessage(message.original),
    }
  })
}
export async function getNewLocation(topicKey: TopicKey): Promise<TopicSlug | null> {
  const topics = await db.query(sql`
    SELECT
      topic_slug
    FROM
      topics
    WHERE
      topic_key = ${topicKey}
  `)
  return topics.length ? topics[0].topic_slug : null;
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

// interface Topic {
//   _id: TopicSlug;
//   subjectID: TopicKey;
//   start: Date;
//   end: Date;

//   subject: string;
//   first: {name: string; email: string;}
//   messages: number;
// }

export async function page(page: number, numberPerPage: number = 20): Promise<
  (
    Omit<Topic, 'start' | 'end'> &
    {
      start: moment.Moment;
      end: moment.Moment;
    }
  )[] & {
  last: boolean;
}> {
  const res: Topic[] = await db.query(sql`
    SELECT
      t.topic_slug AS "_id",
      t.topic_key AS "subjectID",
      t.topic_name AS "subject",
      m.start AS "start",
      m.end AS "end",
      m.messages AS "messages",
      (
        SELECT
          row_to_json(x)
        FROM (
          SELECT
            from_name AS "name",
            from_email AS "email"
          FROM
            messages
          WHERE
            topic_id = t.id
            AND sent_at = m.start) x) AS "first"
    FROM (
      SELECT
        topic_id,
        min(sent_at) AS "start",
        max(sent_at) AS "end",
        count(*) AS "messages"
      FROM
        messages
      GROUP BY
        topic_id
      ORDER BY
        max(sent_at)
        DESC OFFSET ${page * numberPerPage}
      LIMIT ${numberPerPage + 1}) m
      INNER JOIN topics AS t ON t.id = m.topic_id
    ORDER BY
      m.end DESC
  `);

  console.log(res);

  const last = res.length < numberPerPage + 1;
  if (!last) res.pop();

  return Object.assign(res.map((topic) => ({
    ...topic,
    start: moment(topic.start),
    end: moment(topic.end)
  })), {last});
}

// TODO: fetch the 10 records once every 10 minutes
export const getAllMessagesForSearch = async function (start: number, limit: number) {
  return await db.query(sql`
    SELECT
      m.message_key AS "objectID",
      t.topic_name AS "subject",
      substring(m.original_content FROM 1 for 5000) AS "content",
      m.from_name AS "fromName",
      m.from_email AS "fromEmail",
      m.sent_at AS "date",
      t.topic_key AS "subjectID"
    FROM
      messages m
    INNER JOIN topics t ON t.id = m.topic_id
    ORDER BY m.sent_at DESC
    OFFSET ${start}
    LIMIT ${limit}
  `);
};


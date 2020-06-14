import * as  database from './database'

export default function pipermailUnresolve(month: string, id: string) {
  return database.logationFromUrl('https://mail.mozilla.org/pipermail/es-discuss/' + month + '/' + id + '.html')
    .then(function (location) {
      if (!location) return null;
      return '/topic/' + location.topic_slug + '#content-' + location.messageNum;
    });
}
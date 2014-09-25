var hljs = require('highlight.js');
var marked = require('marked');

var profiles = require('../profiles.json');

marked.setOptions({
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  highlight: function(code, lang) {
    try {
      if (lang) lang = lang.toLowerCase();
      if (lang === 'js' || lang === 'javascript') {
        return hljs.highlight('javascript', code).value;
      }
    } catch (ex) {} // if something goes wrong then
  }
});


exports.processMessage = processMessage;
function processMessage(body) {
  //un-escape
  body = body.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  //fix bug in marked where lines starting in `#` are turned into headings
  //even if they are actually issue numbers
  body = body.replace(/^#(\d+)( |\.|\:)/gim, '.#$1$2')
  var oldBody = '';
  //This is where all the time is spent
  var i = 0;
  if (/john cowan/.test(body)) {
    //this regex is too expensive to be in the loop
    body = body.replace(/--+(\n|[^\-])*john cowan\n(\n|[^\-])*$/i, '')
  }
  body = body.replace(/\n_____+\n(?:.*|\n)*/i, '');
  if (/content-disposition: inline/i.test(body)) {
    //this regex is too expensive to be in the loop
    body = body.replace(/(?:.+\n)*content-disposition: inline/i, '');
  }
  while (oldBody != body) { i++;
    oldBody = body;
    body = body.replace(/^hi ?\w*.?/i, '')
              .replace(/\n-+ *original *message *-+\n(?:\n|.)*$/gi, '')
              .replace(/\n-+ *next *part *-+\n(?:\n|.)*$/gi, '')
              .replace(/\n-+ *message *d'origine *-+\n(?:\n|.)*$/gi, '')
              .replace(/\n *jd$/i, '')
              .replace(/dave$/i, '')
              .replace(/sam$/i, '')
              .replace(/jeff$/i, '')
              .replace(/nicolas$/i, '')
              .replace(/olav junker.*$/i, '')
              .replace(/burak$/i, '')
              .replace(/eric$/i, '')
              .replace(/herby$/i, '')
              .replace(/david$/i, '')
              .replace(/allen$/i, '')
              .replace(/daniel$/i, '')
              .replace(/paul hoffman$/i, '')
              .replace(/\{* *kevin *\}*$/i, '')
              .replace(/\/?andreas$/i, '')
              .replace(/rick$/i, '')
              .replace(/wes$/i, '')
              .replace(/thanks\!?$/i, '')
              .replace(/-+ *\nwesley.* garland(?:\n|.)*$/i, '')
              .replace(/-+ ?\w+$/i, '')
              .replace(/\\\w+$/i, '')
              .replace(/\n\/\w+$/i, '')
              .replace(/-- \n(?:.|\n)*$/i, '') // "standard signature pattern"
              .replace(/\np t withington(?:\n|.)*$/i, '')
              .replace(/-+(?: *\n*)*Burak Emir(?:\n|.)*$/, '')
              .replace(/(?:regards)|(?:cheers\,?)(?: *\n*)*[^\n]+(?: *\n*)*$/i, '')
              .replace(/-+(?: *\n*)*rediscover the web(?:\n|.)*$/gi, '')
              .replace(/<div><span class\=\"gmail_quote\">(?:\n|.)*<\/div><br>$/i, '')
              .replace(/(?:^|\s)on .*\d\d.*$/i, '')
              .replace(/\n.+(?: |>)wrote:?$/i, '')
              .replace(/\n---+\nspket(?:\n|.)*$/i, '')
              .replace(/\n-+$/i, '')
              .trim();
    body = skipWhile(body.split('\n').reverse(), function (v) { return v[0] === '>'; }).reverse().join('\n');
  }
  body = body.replace(/(>.*\n)(\w)/gi, '$1\n\$2');
  body = body.replace(/(?:\n\n|^)(?:>\n)+/gi, '\n\n');
  return body;
}

exports.renderMessage = renderMessage;
function renderMessage(body) {
  return redirectLinks(shortenLinks(marked(body)));
}

exports.processNote = processNote;
function processNote(content) {
  /*
  content = content.replace(/^#.*\n+(.*)/, function (_, atendees) {
    return '# ' + date + ' Meeting Notes\n\n' +
      atendees.replace(/([\w\'\-]+\s[\w\'\-]+) \(([A-Z]{2,3})\)/g, function (_, name, id) {
        if (!profiles.some(function (profile) { return profile.id === id })) {
          profiles.push({id: id, displayName: name});
        }
        return '[[[PersonName:' + name + ']]]';
      })
      .replace(/\,$/, '');
  });
  // Complete Name: "Brendan Eich:"
  content = content.replace(/^([\w\'\-]+\s[\w\'\-]+)[\.:]/gm, function(_, name) {
    return '[[[PersonName:' + name + ']]]';
  });
  // single: "AB:" or multiple: "AB/BC/CD:"
  var findShortNames = /^([A-Z]{2,3}(?:(?:, |\/)[A-Z]{2,3})*)[\.:]/gm;
  content = content.replace(findShortNames, function(match, members) {
    return '**' + members.split(/, |\//).join('/') + ':**';
  });
  */

  content = marked(content);

  /*
  content = content.replace(/\[\[\[PersonName:((?:[\w\'\-]|&#39;)+\s(?:[\w\'\-]|&#39;)+)\]\]\]|\b([A-Z]{2,3})\b/g, function (_, name, id) {
    id = id || name;
    id = id.replace(/&#39;/g, "'")
    for (var i = 0; i < profiles.length; i++) {
      if (profiles[i].id === id || profiles[i].displayName === id) {
        return profiles[i].displayName;
      }
    }
    return id;
  });
  content = redirectLinks(shortenLinks(content));
  */
  return content;
}

function skipWhile(arr, condition) {
  var res = [];
  var done = false;
  for (var i = 0; i < arr.length; i++) {
    if (done) {
      res.push(arr[i]);
    } else if (!condition(arr[i])) {
      res.push(arr[i]);
      done = true;
    }
  }
  return res;
}

var GITHUB = 'github.com/';
var WIKI = 'wiki.ecmascript.org/';
var BUGS = 'bugs.ecmascript.org/show_bug.cgi?id=';
var PIPERMAIL = 'mail.mozilla.org/pipermail/es-discuss/';
function shortenLinks(html) {
  return html.replace(/(<a [^<>]*>)https?:\/\/([^<>]+)(<\/a>)/gi, function (_, start, text, end) {
    var match;
    if (text.substr(0, GITHUB.length).toLowerCase() === GITHUB) {
      text = text.substr(GITHUB.length);
      text = text.replace(/^([^\/]+\/[^\/]+)\/(?:pull|issues)\/(\d+)(#.*)?$/g, function (_, repo, issue, fragment) {
        return repo + '#' + issue;
      });
    } else if (text.substr(0, WIKI.length).toLowerCase() === WIKI) {
      text = text.substr(WIKI.length);
      if (/^doku.php\?id=[^&]+$/.test(text)) {
        text = text.replace(/^doku.php\?id=([^&]+)$/, '$1');
      } else if (/^lib\/exe\/fetch.php/.test(text)) {
        text = text.replace(/.*media=/g, '');
      }
    } else if (text.substr(0, BUGS.length).toLowerCase() === BUGS) {
      text = 'ecmascript#' + text.substr(BUGS.length);
    } else if (text.substr(0, PIPERMAIL.length).toLowerCase() === PIPERMAIL) {
      text = 'esdiscuss/' + text.substr(PIPERMAIL.length).replace(/\.html$/, '');
    }
    return start + text.replace(/\/$/, '') + end;
  }).replace(/<\/a>\s+<a /gi, '</a>, <a ');
}

function redirectLinks(html) {
  return html.replace(/(<a[^<>]*) href=\"https?:\/\/mail\.mozilla\.org(\/pipermail\/es-discuss\/[^\/]+\/[^\/]+.html)\"([^<>]*>)/gi, '$1 href="$2" $3');
}

//'https://mail.mozilla.org/pipermail/es-discuss/' + month + '/' + id + '.html'

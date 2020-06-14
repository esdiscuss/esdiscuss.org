var slug = require('slugg');
var hljs = require('highlight.js');
var md = require('markdown-it')({
  linkify: true,
  highlight: function(code: string, lang?: string) {
    try {
      if (lang) lang = lang.toLowerCase();
      if (lang === 'js' || lang === 'javascript') {
        return hljs.highlight('javascript', code).value;
      }
    } catch (ex) {} // if something goes wrong then
  }

});

var profiles: {id: string, displayName: string}[] = require('../profiles.json');

export function processMessage(body: string) {
  //un-escape
  body = body.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  //fix problem in markdown where lines starting in `#` are turned into headings
  //even if they are actually issue numbers
  body = body.replace(/^#(\d+)( |\.|\:)/gim, '.#$1$2')
  var oldBody = '';
  //This is where all the time is spent
  if (/john cowan/.test(body)) {
    //this regex is too expensive to be in the loop
    body = body.replace(/--+(\n|[^\-])*john cowan\n(\n|[^\-])*$/i, '')
  }
  body = body.replace(/\n_____+\n(?:.*|\n)*/i, '');
  if (/content-disposition: inline/i.test(body)) {
    //this regex is too expensive to be in the loop
    body = body.replace(/(?:.+\n)*content-disposition: inline/i, '');
  }
  while (oldBody != body) {
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
              .replace(/\—claude$/i, '')
              .replace(/\~tj$/i, '')
              .replace(/\*\/#\!\/\*JoePea$/i, '')
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
              .replace(/(?:^|\s)on .*\d\d.*\>(?:\n|\s)*wrote:$/i, '')
              .replace(/\n---+\nspket(?:\n|.)*$/i, '')
              .replace(/\n-+$/i, '')
              .trim();
    body = skipWhile(body.split('\n').reverse(), function (v) { return v[0] === '>'; }).reverse().join('\n');
  }
  body = body.replace(/(>.*\n)(\w)/gi, '$1\n\$2');
  body = body.replace(/(?:\n\n|^)(?:>\n)+/gi, '\n\n');
  return body;
}

export function renderMessage(body: string) {
  return redirectLinks(shortenLinks(md.render(body)));
}

export function processNote(content: string, date: string, isNotMeetingNotes: boolean, month: string) {
  if (!isNotMeetingNotes) {
    content = content.replace(/^#.*\n+(.*)/, function (_, atendees: string) {
      return '# ' + date + ' Meeting Notes\n\n' +
        atendees.replace(/([\w\'\-]+\s[\w\'\-]+) \(([A-Z]{2,3})\)/g, function (_, name: string, id: string) {
          if (!profiles.some(function (profile) { return profile.id === id })) {
            profiles.push({id: id, displayName: name});
          }
          return '[[[PersonName:' + name + ']]]';
        })
        .replace(/\,$/, '');
    });
  }
  // Complete Name: "Brendan Eich:"
  content = content.replace(/^([\w\'\-]+\s[\w\'\-]+)[\.:]/gm, function(_, name) {
    return '[[[PersonName:' + name + ']]]';
  });
  // single: "AB:" or multiple: "AB/BC/CD:"
  var findShortNames = /^([A-Z]{2,3}(?:(?:, |\/)[A-Z]{2,3})*)[\.:]/gm;
  content = content.replace(findShortNames, function(_, members) {
    return '**' + members.split(/, |\//).join('/') + ':**';
  });

  content = md.render(content);

  content = content.replace(/\[\[\[PersonName:((?:[\w\'\-]|&#39;)+\s(?:[\w\'\-]|&#39;)+)\]\]\]/g, function (_, name) {
    name = name.replace(/&#39;/g, "'")
    for (var i = 0; i < profiles.length; i++) {
      if (profiles[i].id === name || profiles[i].displayName === name) {
        return profiles[i].displayName;
      }
    }
    return name;
  });
  content = redirectLinks(shortenLinks(content));
  content = content.replace(/(<a[^<>]*) href=\"[a-z]+\-([0-9]{1,2})\.md((?:\#[^\"]*))\"([^<>]*>)/gi, (_, start, day, fragment, end) => {
    return start + ' href="/notes/' + month + '-' + (day.length === 1 ? '0' : '') + day + fragment + '"' + end;
  });

  content = content.replace(/(\<h\d)\>([^\<]+)(\<\/h)/g, (_, start, text, end) => {
    return '<div style="height:56px;margin-top:-56px" id="' + slug(text.replace(/\./g, '')) + '"></div>' + start + '>' + text + end;
  });
  return content;
}

function skipWhile<T>(arr: T[], condition: (v: T) => boolean) {
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
function shortenLinks(html: string) {
  return html.replace(/(<a [^<>]*>)https?:\/\/([^<>]+)(<\/a>)/gi, function (_, start: string, text: string, end: string) {
    if (text.substr(0, GITHUB.length).toLowerCase() === GITHUB) {
      text = text.substr(GITHUB.length);
      text = text.replace(/^([^\/]+\/[^\/]+)\/(?:pull|issues)\/(\d+)(#.*)?$/g, function (_, repo: string, issue: string, _fragment: string) {
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

function redirectLinks(html: string) {
  return html.replace(/(<a[^<>]*) href=\"https?:\/\/mail\.mozilla\.org(\/pipermail\/es-discuss\/[^\/]+\/[^\/]+.html)\"([^<>]*>)/gi, '$1 href="$2" $3');
}

//'https://mail.mozilla.org/pipermail/es-discuss/' + month + '/' + id + '.html'

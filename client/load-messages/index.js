var ajax = require('ajax');
var marked = require('marked');

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

var containers = document.querySelectorAll('[data-message]');
for (var i = 0; i < containers.length; i++) {
  (function (container, index) {
    var called = false;
    var messageID = container.getAttribute('data-message');
    getMessage(messageID, function (err, res) {
      if (called) throw new Error('called multiple times');
      called = true;
      if (err) {
        container.innerHTML = '<div class="span12 well">' +
            'This message failed to load.  If it was sent recently it may be ' +
            'that the bot has not yet added it to our archive.' +
          '</div>';
        return;
      }
      //container.textContent = JSON.stringify(res);
      var content = marked(trimBody(res.content));
      container.innerHTML = 
        '<div class="span1">' +
          '<img />' +
        '</div>' +
        '<div class="span11">' +
          '<div class="well well-small" style="height: 30px; margin-top: 10px;">' +
            (res.header.from.name || res.head.from.email) +
            '<div class="pull-right">' +
              '<button class="btn btn-inverse" id="show-original-' + index + '">' +
                'view original' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div id="content-' + index + '">' +
            content +
          '</div>' +
        '</div>';
      var showingOriginal = false;
      var btn = document.getElementById('show-original-' + index);
      var cont = document.getElementById('content-' + index);
      btn.addEventListener('click', function () {
        if (showingOriginal) {
          btn.textContent = 'view original';
          cont.innerHTML = content;
        } else {
          btn.textContent = 'view formatted';
          getOriginal(messageID, function (err, original) {
            if (err) throw err;
            var match = /^(.*)\/(.*)$/.exec(messageID);
            cont.innerHTML = '<pre>' + original
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;') + '</pre>' + 
              '<a class="btn" target="_blank" href="https://github.com/esdiscuss/' + match[1] + '/edit/master/' + match[2] + '/edited.md">' +
                'edit' +
              '</a>';
          })
        }
        showingOriginal = !showingOriginal;
      });
    });
  }(containers[i], i));
}

function getMessage(id, callback) {
  var content, header;
  var remaining = 2;
  ajax({
    url: '/' + id + '/header.json',
    error: function (obj, msg, err) {
      callback(err || new Error(msg));
    },
    success: function (data) {
      try {
        header = JSON.parse(data);
      } catch (ex) {
        return callback(ex);
      }
      if (0 === --remaining) return callback(null, {header: header, content: content})
    }
  })
  ajax({
    url: '/' + id + '/edited.md',
    error: function (obj, msg, err) {
      callback(err || new Error(msg));
    },
    success: function (data) {
        content = data
      if (0 === --remaining) return callback(null, {header: header, content: content})
    }
  })
}
function getOriginal(id, callback) {
  ajax({
    url: '/' + id + '/original.md',
    error: function (obj, msg, err) {
      callback(err || new Error(msg));
    },
    success: function (data) {
      return callback(null, data)
    }
  })
}

function trimBody(body) {
  //fix bug in marked where lines starting in `#` are turned into headings
  //even if they are actually issue numbers
  body = body.replace(/^#(\d+)( |\.|\:)/gim, '.#$1$2')
  var oldBody = '';
  //This is where all the time is spent
  var i = 0;
  if (/john cowan/.exec(body)) {
    //this regex is too expensive to be in the loop
    body = body.replace(/--+(\n|[^\-])*john cowan\n(\n|[^\-])*$/i, '')
  }
  body = body.replace(/\n_____+\n(?:.*|\n)*/i, '');
  while (oldBody != body) { i++;
    oldBody = body;
    body = body.replace(/^hi \w+.?/i, '')
              .replace(/\n-+ *original *message *-+\n(?:\n|.)*$/gi, '')
              .replace(/\n-+ *next *part *-+\n(?:\n|.)*$/gi, '')
              .replace(/\n-+ *message *d'origine *-+\n(?:\n|.)*$/gi, '')
              .replace(/\n *jd$/i, '')
              .replace(/dave$/i, '')
              .replace(/jeff$/i, '')
              .replace(/nicolas$/i, '')
              .replace(/olav junker.*$/i, '')
              .replace(/burak$/i, '')
              .replace(/eric$/i, '')
              .replace(/herby$/i, '')
              .replace(/david$/i, '')
              .replace(/allen$/i, '')
              .replace(/\/?andreas$/i, '')
              .replace(/rick$/i, '')
              .replace(/wes$/i, '')
              .replace(/-+ *\nwesley.* garland(?:\n|.)*$/i, '')
              .replace(/-+ ?\w+$/i, '')
              .replace(/\\\w+$/i, '')
              .replace(/\/\w+$/i, '')
              .replace(/-- ?\n.*$/i, '')
              .replace(/\np t withington(?:\n|.)*$/i, '')
              .replace(/-+(?: *\n*)*Burak Emir(?:\n|.)*$/, '')
              .replace(/(?:regards)|(?:cheers\,?)(?: *\n*)*[^\n]+(?: *\n*)*$/i, '')
              .replace(/-+(?: *\n*)*rediscover the web(?:\n|.)*/gi, '')
              .replace(/(?:.+\n)*content-disposition: inline/i, '')
              .replace(/<div><span class\=\"gmail_quote\">(?:\n|.)*<\/div><br>$/i, '')
              .replace(/on .*\d\d.*$/i, '')
              .replace(/\n.+(?: |>)wrote:?$/i, '')
              .replace(/\n---+\nspket(?:\n|.)*$/i, '')
              .replace(/\n-+$/i, '')
              .trim();
    //body = trimFooter(body);
    body = skipWhile(body.split('\n').reverse(), function (v) { return v[0] === '>'; }).reverse().join('\n');
  }
  body = body.replace(/(>.*\n)(\w)/gi, '$1\n\$2');
  body = body.replace(/(?:\n\n|^)(?:>\n)+/gi, '\n\n');
  //console.log(i);
  return body;
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

function trimFooter(str) {

}

function skipWhileReverse(arr, condition) {
}
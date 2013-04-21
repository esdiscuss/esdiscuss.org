var hljs = require('highlight.js');
var marked = require('marked');
var hash = window.location.hash;

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

function scroll(el) {
  return el.scrollIntoView(true);
}

var containers = document.querySelectorAll('[data-message]');
for (var i = 0; i < containers.length; i++) {
  (function (container, index) {
    var called = false;
    var messageID = container.getAttribute('data-message');

    var body = container.querySelector('script[type="test/formatted"]').innerHTML;
    var content = container.querySelector('.comment-body');
    content.innerHTML += '<div class="formatted-view">' + marked(trimBody(body)) + '</div>';

    var srcView = content.querySelector('.source-view');
    var frmView = content.querySelector('.formatted-view');
    srcView.style.display = 'none';

    var showingOriginal = false;
    var btn = container.querySelector('.showOriginal');
    var btnSpan = btn.querySelector('span');
    btn.addEventListener('click', function () {
      if (showingOriginal) {
        btnSpan.textContent = ' View Original';
        srcView.style.display = 'none';
        frmView.style.display = 'block';
      } else {
        btnSpan.textContent = ' View Formatted';
        srcView.style.display = 'block';
        frmView.style.display = 'none';
      }
      showingOriginal = !showingOriginal;
    });
    if (hash === '#' + container.id) {
      setTimeout(function () {
        scroll(container)
      }, 100);
    }

  }(containers[i], i));
}

function trimBody(body) {
  //un-escape
  body = body.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
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
              .replace(/\{* *kevin *\}*$/i, '')
              .replace(/\/?andreas$/i, '')
              .replace(/rick$/i, '')
              .replace(/wes$/i, '')
              .replace(/thanks\!?$/i, '')
              .replace(/-+ *\nwesley.* garland(?:\n|.)*$/i, '')
              .replace(/-+ ?\w+$/i, '')
              .replace(/\\\w+$/i, '')
              .replace(/\/\w+$/i, '')
              .replace(/-- ?\n.*$/i, '')
              .replace(/\np t withington(?:\n|.)*$/i, '')
              .replace(/-+(?: *\n*)*Burak Emir(?:\n|.)*$/, '')
              .replace(/(?:regards)|(?:cheers\,?)(?: *\n*)*[^\n]+(?: *\n*)*$/i, '')
              .replace(/-+(?: *\n*)*rediscover the web(?:\n|.)*$/gi, '')
              .replace(/(?:.+\n)*content-disposition: inline/i, '')
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

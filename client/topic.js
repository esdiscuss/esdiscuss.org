var hash = window.location.hash;

function scroll(el) {
  el.scrollIntoView(true);
  el.className += ' fragment-highlight';
  window.scrollBy(0, -64);
}
window.onhashchange = function () {
  window.scrollBy(0, -64);
  var id = window.location.hash.substr(1);
  var highlighted = document.getElementsByClassName('fragment-highlight');
  for (var i = 0; i < highlighted.length; i++) {
    highlighted[i].className = highlighted[i].className.replace(/ ?fragment-highlight/, '');
  };
  document.getElementById(id).className += ' fragment-highlight';
}

var containers = document.querySelectorAll('[data-message]');
for (var i = 0; i < containers.length; i++) {
  (function (container, index) {
    var called = false;

    var srcView = container.querySelector('.source-view');
    var frmView = container.querySelector('.formatted-view');

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

(function (c, s) {
  s.async=true;
  s.src="//cdn.carbonads.com/carbon.js?zoneid=1673&serve=C6AILKT&placement=esdiscussorg";
  s.id="_carbonads_js";
  c.appendChild(s);
}(document.getElementById('carbon-location'), document.createElement('script')));

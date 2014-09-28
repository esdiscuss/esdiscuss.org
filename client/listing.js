require('keyboard') // creates a global `Keyboard`
var $ = document.querySelector.bind(document)
var keyboard = new Keyboard(window)

keyboard.on('Left', function (e) {
  if ($('[rel="previous"]')) {
    location.assign($('[rel="previous"]').getAttribute('href'))
  }
})
keyboard.on('Right', function (e) {
  if ($('[rel="next"]')) {
    location.assign($('[rel="next"]').getAttribute('href'))
  }
})

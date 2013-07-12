var marked = require('../lib/process.js').renderMessage
var $ = document.getElementById.bind(document)
var inPreview = false

$('preview')
  .addEventListener('click', function () {
    inPreview = !inPreview
    if (inPreview) {
      $('preview-display').innerHTML = marked($('edited').value)
      $('preview-display').style.display = 'block'
      $('edited-display').style.display = 'none'
    } else {
      $('preview-display').style.display = 'none'
      $('edited-display').style.display = 'block'
    }
  }, false)

$('save')
  .addEventListener('click', function () {
    throw new Error('save is not yet implemented')
  }, false)
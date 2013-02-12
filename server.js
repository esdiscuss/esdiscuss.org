var pipermail = require('pipermail');
var express = require('express');
var app = express();

app.set('view eingine', 'jade');

app.use(express.logger('dev'));


var convoIDs = {};
pipermail('https://mail.mozilla.org/pipermail/es-discuss/', {progress: true, cache: true})
  .pipe(require('./lib/pipermail-filters').spam())
  .pipe(require('./lib/pipermail-filters').fixSubjects())
  .pipe(require('./lib/pipermail-filters').selectSubject())
  .pipe(pipermail.stringify())
  .pipe(require('fs').createWriteStream('results.js'));
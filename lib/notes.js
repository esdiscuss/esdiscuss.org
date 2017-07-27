'use strict';

var express = require('express');
var Repository = require('github-stream');
var processor = require('./process.js');

var app = express.Router();

var notes = new Repository('rwaldron', 'tc39-notes', {
  updateFrequency: '10m',
  retryFrequency: '2m',
  auth: process.env.GITHUB_AUTH_TOKEN
});

var months = [];
var monthData = {};
var dayData = {};

notes.on('data', function (entry) {
  entry.path = entry.path.replace(/^(\/es\d+)?\//, '');
  if (entry.type === 'File' && /^\d\d\d\d\-\d\d\//.test(entry.path) && entry.body) {
    var month = entry.path.split('/')[0];
    var name = entry.path.split('/').slice(1).join('/');
    var monthObject = monthData[month] || (monthData[month] = {
      month: month,
      days: [],
      files: [],
      fileData: {}
    });
    if (!months.some(function (m) { return m.month === month; })) {
      months.push(monthObject);
    }
    if (/^\w+\-\d+\.md$/.test(name)) {
      name = name.replace(/[^\d]/g, '');
      if (name.length === 1) name = '0' + name;
      name = month + '-' + name;
      if (monthObject.days.indexOf(name) === -1) {
        monthObject.days.push(name);
      }
      entry.html = processor.processNote(entry.body.toString(), name);
      dayData[name] = entry;
    } else if (/^\d\d\d\d\-\d\d\-\d\d\.md$/.test(name)){
      name = name.replace(/\.md$/g, '');
      if (monthObject.days.indexOf(name) === -1) {
        monthObject.days.push(name);
      }
      entry.html = processor.processNote(entry.body.toString(), name);
      dayData[name] = entry;
    } else if (/\.md$/.test(name)) {
      const titleMatch = /^\# ([^\n]+)/.exec(entry.body.toString().trim());
      entry.title = titleMatch ? titleMatch[1] : name;
      entry.html = processor.processNote(entry.body.toString(), name, true);
      if (monthObject.files.indexOf(name) === -1) {
        monthObject.files.push(name);
      }
      monthObject.fileData[name] = entry;
    } else {
      if (monthObject.files.indexOf(name) === -1) {
        monthObject.files.push(name);
      }
      monthObject.fileData[name] = entry;
    }
  }
});

notes.on('error', function (err) {
  console.error(err.stack);
});

app.use('/notes', function (req, res, next) {
  return notes.ready.done(function () {
    next();
  }, next);
})
app.get('/notes/:date', function (req, res, next) {
  if (/^\d\d\d\d-\d\d$/.test(req.params.date)) return res.redirect('/notes');
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(req.params.date)) return next();
  var entry = dayData[req.params.date];
  if (entry && entry.html) {
    res.render('notes', {
      date: req.params.date,
      content: entry.html
    });
  } else {
    next();
  }
})
app.get('/notes/:month/:file', function (req, res, next) {
  var entry = monthData[req.params.month] && monthData[req.params.month].fileData[req.params.file];
  if (entry && entry.html) {
    res.render('notes', {
      date: entry.title || (req.params.month + '/' + req.params.file),
      content: entry.html
    });
  } else if (entry) {
    res.type(req.params.file);
    res.send(entry.body);
  } else {
    next();
  }
})
app.get('/notes', function (req, res, next) {
  res.render('notes-listing', {months: months});
})

module.exports = app;

'use strict';

var express = require('express');
var Repository = require('github-stream');
var processor = require('./process.js');
var path = require('path');

var app = express.Router();

var meetings = new Repository('JacksonScript', 'meetings', null, {
  updateFrequency: '10m',
  retryFrequency: '2m'
});

var meetups = [];
var meetupData = {};

meetings.on('data', function (entry) {
  var basename = path.basename(entry.path);
  var extension = path.extname(entry.path)
  var containedIn = entry.path.split(path.sep)[1];
  var pathLength = entry.path.split(path.sep).length;

  function addAsset(meetupDay, asset){
    console.log('addAsset', meetupDay, asset.title)
    var meetupObject = meetupData[meetupDay] || (meetupData[meetupDay] = {
      meetupDay: meetupDay,
      assets: []
    });
    meetupObject.assets.push(asset);

    if (!meetups.some(function (m) { return m.meetupDay === meetupDay; })) {
      meetups.push(meetupObject);
    }
  }

  if (entry.type === 'File'
      && pathLength === 2
      && entry.path.split(path.sep)[pathLength-1] != 'README.md'
     )
  {
    var title = entry.path.split(path.sep)[pathLength-1].replace(path.extname(entry.path),'');
    console.log('FOUND PAGE', title);
    var meetupDay = entry.path.split(path.sep)[pathLength-2];
    var html = processor.processNote(entry.body.toString());
  }

  if (entry.type === 'File' && pathLength === 3) {
    var title = entry.path.split(path.sep)[pathLength-1].replace(path.extname(entry.path),'');
    console.log('FOUND NOTE', title);
    var meetupDay = entry.path.split(path.sep)[pathLength-2];
    var html = processor.processNote(entry.body.toString());
    addAsset(meetupDay, {title: title, html: html})
  }

  if (entry.type === 'Directory' && pathLength === 3) {
    var meetupDay = entry.path.split(path.sep)[pathLength-2];
    console.log('FOUND MEETUP', meetupDay);
  }

  if (entry.type === 'Directory' && pathLength === 4) {
    var title = entry.path.split(path.sep)[pathLength-2];
    console.log('FOUND PRESENTATION', title);
    var meetupDay = entry.path.split(path.sep)[pathLength-3];
    addAsset(meetupDay, {title: title})
  }

/*
  entry.path = entry.path.replace(/^\/es6\//, '');
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
    } else {
      if (monthObject.files.indexOf(name) === -1) {
        monthObject.files.push(name);
      }
      monthObject.fileData[name] = entry;
    }
  }
  */
});

meetings.on('error', function (err) {
  console.error(err.stack);
});

app.get('/meetings/:date/:title', function (req, res, next) {
  return meetings.ready.done(function () {
    var index = function() {
      for(var i = 0, l = meetupData[req.params.date].assets.length; i < l; i++){
//        console.log('checking',meetupData[req.params.date])
        if(meetupData[req.params.date].assets[i].title === req.params.title) return i;
      }
      return -1;
    }
    var entry = meetupData[req.params.date] && meetupData[req.params.date].assets[index()];
    if (entry) {
      res.render('meetings', {content:entry.html});
    } else {
      next();
    }
  }, next);
})
app.get('/meetings', function (req, res, next) {
  res.render('meetings-listing', {meetups: meetups});
})

module.exports = app;

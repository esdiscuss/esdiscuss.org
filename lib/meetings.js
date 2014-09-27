'use strict';

var express = require('express');
var Repository = require('github-stream');
var processor = require('./process.js');
var path = require('path');
var moment = require('moment');
var icalevent = require('icalevent');

var app = express.Router();

var meetings = new Repository('JacksonScript', 'meetings', null, {
  updateFrequency: '10m',
  retryFrequency: '2m'
});

var meetups = [];
var meetupData = {};
var pages = [];

meetings.on('data', function (entry) {
  var basename = path.basename(entry.path);
  var extension = path.extname(entry.path)
  var containedIn = entry.path.split(path.sep)[1];
  var pathLength = entry.path.split(path.sep).length;

  function addAsset(meetupDay, asset){
    var meetupObject = meetupData[meetupDay] || (meetupData[meetupDay] = {
      meetupDay: meetupDay,
      assets: []
    });
    meetupObject.assets.push(asset);

    if (!meetups.some(function (m) { return m.meetupDay === meetupDay; })) {
      meetups.push(meetupObject);
    }
  }

  function addLocation(meetupDay, location){
    var meetupObject = meetupData[meetupDay] || (meetupData[meetupDay] = {
      meetupDay: meetupDay,
      assets: []
    });
    meetupObject.location = location;
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
    pages.push({title:title,html:html});
  }

  if (entry.type === 'File'
      && pathLength === 3
      && entry.path.split(path.sep)[pathLength-1] != 'location.json'
     ) {
    var title = entry.path.split(path.sep)[pathLength-1].replace(path.extname(entry.path),'');
    console.log('FOUND NOTE', title);
    var meetupDay = entry.path.split(path.sep)[pathLength-2];
    var html = processor.processNote(entry.body.toString());
    addAsset(meetupDay, {title: title, html: html})
  }

  if (entry.type === 'File'
      && pathLength === 3
      && entry.path.split(path.sep)[pathLength-1] === 'location.json'
     ) {
    var meetupDay = entry.path.split(path.sep)[pathLength-2];
    var location = JSON.parse(entry.body.toString());
    location.popoverContent="<a href='/vcal/" + meetupDay + ".ics'>iCal</a><br/>"
    var googleTimeFormat = "YYYYMMDD\THHmmss"
    var googleLink = "<a href='//www.google.com/calendar/event?action=TEMPLATE";
    googleLink+="&text=JacksonScript+"+meetupDay;
    googleLink+="&dates="
      +moment.utc(location.timeStart)
      .format(googleTimeFormat)
      .replace('+00:00','')+"Z/"
      +moment.utc(location.timeEnd)
      .format(googleTimeFormat)
      .replace('+00:00','')+"Z";
    googleLink+="&details="+"a monthly meetup of Jackson area JavaScript Developers".replace(' ', '+');
    googleLink+="&location="+location.name.replace(' ', '+')+',+'+location.address.replace(' ','+');

    googleLink+="' target='_blank' rel='nofollow'>Google</a>"
    location.popoverContent+=googleLink;
    console.log('FOUND LOCATION', meetupDay);
    addLocation(meetupDay, location);
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
        if(meetupData[req.params.date].assets[i].title === req.params.title) return i;
      }
      return -1;
    }
    var entry = meetupData[req.params.date] && meetupData[req.params.date].assets[index()];
    if (entry) {
      entry.meetupDay = req.params.date;
      res.render('meetings', {content:entry});
    } else {
      next();
    }
  }, next);
})
app.get('/meetings', function (req, res, next) {
  res.render('meetings-listing', {meetups: meetups, pages:pages, moment: moment});
})

app.get('/pages/:title', function (req, res, next) {
  return meetings.ready.done(function () {
    var index = function() {
      for(var i = 0, l = pages.length; i < l; i++){
        if(pages[i].title === req.params.title) return i;
      }
      return -1;
    }
    var entry = pages[index()];
    if (entry) {
      res.render('pages', {content:entry});
    } else {
      next();
    }
  }, next);
})

app.get('/vcal/:date', function(req, res, next){
  var date = req.params.date.replace('.ics','');
  return meetings.ready.done(function () {
    var entry = meetupData[date];
    if (entry) {
      var event = new icalevent({
        offset:0,
        start: entry.location.timeStart,
        end: entry.location.timeEnd,
        summary: 'JacksonScript ' + date,
        description: "JacksonScript " + date + "\n https://jacksonscript.org/",
        location: entry.location.name + ", " + entry.location.address,
        organizer: {
          name: "JacksonScript",
          email: "jacksonscript@jacksonscript.org"
        },
        url: "https://jacksonscript.org/"
      });
      res.set('Content-Type', 'text/calendar');
      res.send(event.toFile());
    } else {
      next();
    }
  }, next);
})

module.exports = { app: app, pages: pages };

# esdiscuss.org

This is the project behind http://esdiscuss.org which aims to produce a readable copy of the [esdiscuss mailing list archives](https://mail.mozilla.org/pipermail/es-discuss/).

[![Build Status](https://img.shields.io/travis/esdiscuss/esdiscuss.org/master.svg)](https://travis-ci.org/esdiscuss/esdiscuss.org)
[![Dependency Status](https://img.shields.io/david/esdiscuss/esdiscuss.org.svg)](https://david-dm.org/esdiscuss/esdiscuss.org)

## Contributing

If you want a new feature implemented, open a pull request or submit an issue.

If you just want to show your support for the site, you can donate via [gratipay](https://gratipay.com/esdiscuss/).  This helps cover both hosting costs and developer time spent improving the site.

If you send e-mail to the mailing list (or know someone who does), please remember to use markdown.  The site uses "GitHub Flavored Markdown", and if you mark your code as "js" or "javascript" it will get syntax highlighted automatically.

## Configuring

There are a number of things that should be configured via Environment Variables when in production.  It will work as read-only without any configuration.

 - `BROWSERID_AUDIENCE` (default: `http://localhost:3000`) - used to determine whether a browserID assertion is for the correct domain, and to determine the callback url for github
 - `GITHUB_CLIENT_ID` (default: a client id for testing)
 - `GITHUB_CLIENT_SECRET` (default: a client secret for testing)
 - `COOKIE_SECRET` (default: `adfkasjast`) - a secret used to secure session cookies
 - `MONGO_USER` (default: `read`)
 - `MONGO_PASS` (default: `read`)

N.B. the bot for updating the database is not part of this repository, it is completely separate

## License

All the source code for both this site, and the es-discuss bot is licensed as MIT.  Feel free to adapt this for other communities, there are a lot of pipermail mailing lists out there.

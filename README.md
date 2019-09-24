# esdiscuss.org

This is the project behind http://esdiscuss.org which aims to produce a readable copy of the [esdiscuss mailing list archives](https://mail.mozilla.org/pipermail/es-discuss/).

[![Backers on Open Collective](https://opencollective.com/esdiscuss/backers/badge.svg)](#backers) [![Sponsors on Open Collective](https://opencollective.com/esdiscuss/sponsors/badge.svg)](#sponsors) [![Build Status](https://img.shields.io/travis/esdiscuss/esdiscuss.org/master.svg)](https://travis-ci.org/esdiscuss/esdiscuss.org)
[![Dependency Status](https://img.shields.io/david/esdiscuss/esdiscuss.org.svg)](https://david-dm.org/esdiscuss/esdiscuss.org)

## Contributing

If you want a new feature implemented, open a pull request or submit an issue.

If you just want to show your support for the site, you can donate via [gratipay](https://gratipay.com/esdiscuss/). This helps cover both hosting costs and developer time spent improving the site.

If you send e-mail to the mailing list (or know someone who does), please remember to use markdown. The site uses "GitHub Flavored Markdown", and if you mark your code as "js" or "javascript" it will get syntax highlighted automatically.

## Configuring

In order to use the search (in dev or production), [sign up for Algolia](https://www.algolia.com/users/sign_up) if you don't have an account and configure the following environment variables with your own Algolia variables from the [API Keys](https://www.algolia.com/api-keys) page:

- `ALGOLIA_APPLICATION_ID`: The **Application ID**
- `ALGOLIA_SEARCH_KEY`: The **Search Key**

This can be done on the command line by setting the variables before starting the server with `yarn start`:

```sh
ALGOLIA_APPLICATION_ID=XXXXXXXXXX ALGOLIA_SEARCH_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX yarn start
```

There are also a number of things that should be configured for production. These variables will have default read-only values without any configuration.

- `BROWSERID_AUDIENCE` (default: `http://localhost:3000`) - used to determine whether a browserID assertion is for the correct domain, and to determine the callback url for github
- `GITHUB_CLIENT_ID` (default: a client id for testing)
- `GITHUB_CLIENT_SECRET` (default: a client secret for testing)
- `COOKIE_SECRET` (default: `adfkasjast`) - a secret used to secure session cookies
- `MONGO_USER` (default: `read`)
- `MONGO_PASS` (default: `read`)

N.B. the bot for updating the database is not part of this repository, it is completely separate

## Contributors

This project exists thanks to all the people who contribute.
<a href="graphs/contributors"><img src="https://opencollective.com/esdiscuss/contributors.svg?width=890" /></a>

## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/esdiscuss#backer)]

<a href="https://opencollective.com/esdiscuss#backers" target="_blank"><img src="https://opencollective.com/esdiscuss/backers.svg?width=890"></a>

## Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/esdiscuss#sponsor)]

<a href="https://opencollective.com/esdiscuss/sponsor/0/website" target="_blank"><img src="https://opencollective.com/esdiscuss/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/esdiscuss/sponsor/1/website" target="_blank"><img src="https://opencollective.com/esdiscuss/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/esdiscuss/sponsor/2/website" target="_blank"><img src="https://opencollective.com/esdiscuss/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/esdiscuss/sponsor/3/website" target="_blank"><img src="https://opencollective.com/esdiscuss/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/esdiscuss/sponsor/4/website" target="_blank"><img src="https://opencollective.com/esdiscuss/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/esdiscuss/sponsor/5/website" target="_blank"><img src="https://opencollective.com/esdiscuss/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/esdiscuss/sponsor/6/website" target="_blank"><img src="https://opencollective.com/esdiscuss/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/esdiscuss/sponsor/7/website" target="_blank"><img src="https://opencollective.com/esdiscuss/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/esdiscuss/sponsor/8/website" target="_blank"><img src="https://opencollective.com/esdiscuss/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/esdiscuss/sponsor/9/website" target="_blank"><img src="https://opencollective.com/esdiscuss/sponsor/9/avatar.svg"></a>

## License

All the source code for both this site, and the es-discuss bot is licensed as MIT. Feel free to adapt this for other communities, there are a lot of pipermail mailing lists out there.

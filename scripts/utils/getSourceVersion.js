const execa = require('execa');

module.exports = async function getSourceVersion() {
  const result = await execa('git', ['rev-parse', `--short=8`, 'HEAD']);
  return result.stdout.trim();
}

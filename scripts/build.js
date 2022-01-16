const {readdirSync, writeFileSync, mkdirSync} = require('fs')
const execa = require('execa');
const pug = require('pug')
const less = require('jstransformer')(require('jstransformer-less'));
const cleanCss = require('jstransformer')(require('jstransformer-clean-css'));

async function build() {
  mkdirSync(`build/client`, {recursive: true})
  for (const filename of readdirSync(`client`)) {
    if (filename.endsWith(`.js`)) {
      const result = await execa(require.resolve(`.bin/browserify`), [`client/${filename}`])
      writeFileSync(`build/client/${filename}`, result.stdout)
    }
  }

  const {body: lessResult} = await less.renderFileAsync('less/style.less')
  const {body: cleanResult} = await cleanCss.renderAsync(lessResult)
  writeFileSync(`build/style.css`, cleanResult)

  mkdirSync(`build/views`, {recursive: true})
  for (const filename of readdirSync(`views`)) {
    if (filename.endsWith(`.pug`)) {
      const result = pug.compileFileClient(`views/${filename}`)
      writeFileSync(`build/views/${filename.replace(/\.pug$/, `.js`)}`, result + `\nmodule.exports = template`)
    }
  }
}
build().catch(ex => {
  console.error(ex.stack)
  process.exit(1)
})
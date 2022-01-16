import {readdirSync} from 'fs'

const views = new Map(
  readdirSync(`build/views`)
    .filter(name => name.endsWith(`.js`))
    .map(name => [
      name.replace(/\.js$/, ``),
      require(`../build/views/${name}`)
    ])
)

export default class View {
  public readonly path: string;
  private readonly _view: any;
  constructor(name: string) {
    this._view = views.get(name)
    this.path = name
  }
  render(options: any, cb: any) {
    let result = ''
    try {
      if (!this._view) {
        throw new Error(`The view "${name}" does not exist.`)
      }
      result = this._view(options)
    } catch (ex) {
      return cb(ex)
    }
    cb(null, result)
  }
}

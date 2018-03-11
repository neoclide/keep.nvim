import { Plugin, Function, Autocmd, Command } from 'neovim'
const makeDir = require('./make-dir')
const bluebird = require('bluebird')
const redis = require('redis')
const fs = require('fs')
const path = require('path')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)
bluebird.promisifyAll(fs)

let redisClient
let expire

async function existFile(file) {
  let res
  try {
    res =  await fs.statAsync(file)
  } catch (e) {
    return false
  }
  return res.isFile()
}

@Plugin({ dev: true })
export default class TestPlugin {

  @Autocmd('VimEnter', {
    sync: false,
    pattern: '*'
  })
  async onVimEnter() {
    let host = await this.nvim.getVar('nvim_keep_redis_host')
    let port = await this.nvim.getVar('nvim_keep_redis_port')
    expire = await this.nvim.getVar('nvim_keep_redis_expire') || 5*24*3600
    redisClient = redis.createClient(port, host)
    if (!redisClient) {
      console.error(`redis client not found for ${host || '127.0.0.1'}:${port || 6379}`)
    }
  }

  @Autocmd('VimLeave', {
    sync: false,
    pattern: '*'
  })
  async onVimLeave() {
    if (redisClient) {
      redisClient.quit()
    }
  }

  @Autocmd('BufWritePost', {
    sync: false,
    pattern: '*',
    eval: 'expand("<afile>:p")'
  })
  async onBufWrite(fullpath) {
    if (!redisClient) return
    let stats = await fs.statAsync(fullpath)
    if (stats && stats.isFile()) {
      let content = await fs.readFileAsync(fullpath, 'utf8')
      let key = encodeURIComponent(fullpath)
      await redisClient.setAsync(key, content)
      await redisClient.expireAsync(key, expire)
    }
  }

  @Command('KeepRestore', {
    sync: true,
    nargs: '*'
  })
  async keepRestore(args) {
    if (!redisClient) {
      this.nvim.command(`echom 'redis client not connected'`)
      return
    }
    let fullpath
    const cwd = await this.nvim.eval('getcwd()')
    if (args.length == 0) {
      fullpath = await this.nvim.eval('expand("%:p")')
      if (!path.isAbsolute(fullpath)) {
        fullpath = path.join(cwd, fullpath)
      }
    } else {
      fullpath = path.resolve(cwd, args[0])
    }

    const key = encodeURIComponent(fullpath)
    const content = await redisClient.getAsync(key)
    if (content) {
      await makeDir(path.dirname(fullpath))
      await fs.writeFileAsync(fullpath, content, 'utf8')
      if (args.length == 0) {
        this.nvim.command('edit ' + (args[0] || ''))
      }
    } else {
      this.nvim.command(`echom 'content not found for ${fullpath}'`)
    }
  }

  @Function('KeepRemovedFiles', {sync: true})
  async removedFiles(args) {
    if (!redisClient) return []
    let root = args.length == 0
      ? await this.nvim.eval('getcwd()')
      : args[0]
    const pattern = encodeURIComponent(root) + '*'
    let files = await redisClient.keysAsync(pattern)
    files = files.map(f => decodeURIComponent(f))
    return await bluebird.filter(files, async file => {
      return !await existFile(file)
    })
  }
}

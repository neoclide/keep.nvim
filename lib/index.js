'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _dec, _dec2, _dec3, _dec4, _class, _desc, _value, _class2;

var _neovim = require('neovim');

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object['ke' + 'ys'](descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object['define' + 'Property'](target, property, desc);
    desc = null;
  }

  return desc;
}

const makeDir = require('./make-dir');
const bluebird = require('bluebird');
const redis = require('redis');
const fs = require('fs');
const path = require('path');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
bluebird.promisifyAll(fs);

let redisClient;
let expire;

let TestPlugin = (_dec = (0, _neovim.Plugin)({ dev: true }), _dec2 = (0, _neovim.Autocmd)('VimEnter', {
  sync: false,
  pattern: '*'
}), _dec3 = (0, _neovim.Command)('KeepRestore', {
  sync: true,
  nargs: '*'
}), _dec4 = (0, _neovim.Autocmd)('BufWritePost', {
  sync: false,
  pattern: '*',
  eval: 'expand("<afile>:p")'
}), _dec(_class = (_class2 = class TestPlugin {
  async onVimEnter() {
    let host = await this.nvim.getVar('nvim_keep_redis_host');
    let port = await this.nvim.getVar('nvim_keep_redis_port');
    expire = (await this.nvim.getVar('nvim_keep_redis_expire')) || 5 * 24 * 3600;
    redisClient = redis.createClient(port, host);
    if (!redisClient) {
      console.error(`redis client not found for ${host || '127.0.0.1'}:${port || 6379}`);
    }
  }

  async keepRestore(args) {
    if (!redisClient) {
      this.nvim.command(`echom 'redis client not connected'`);
      return;
    }
    let fullpath;
    const cwd = await this.nvim.eval('getcwd()');
    if (args.length == 0) {
      fullpath = await this.nvim.eval('expand("%:p")');
      if (!path.isAbsolute(fullpath)) {
        fullpath = path.join(cwd, fullpath);
      }
    } else {
      fullpath = path.resolve(cwd, args[0]);
    }

    const key = encodeURIComponent(fullpath);
    const content = await redisClient.getAsync(key);
    if (content) {
      await makeDir(path.dirname(fullpath));
      await fs.writeFileAsync(fullpath, content, 'utf8');
      if (args.length == 0) {
        this.nvim.command('edit ' + (args[0] || ''));
      }
    } else {
      this.nvim.command(`echom 'content not found for ${fullpath}'`);
    }
  }

  async onBufWrite(fullpath) {
    if (!redisClient) return;
    let stats = await fs.statAsync(fullpath);
    if (stats && stats.isFile()) {
      let content = await fs.readFileAsync(fullpath, 'utf8');
      let key = encodeURIComponent(fullpath);
      await redisClient.setAsync(key, content);
      await redisClient.expireAsync(key, expire);
    }
  }
}, (_applyDecoratedDescriptor(_class2.prototype, 'onVimEnter', [_dec2], Object.getOwnPropertyDescriptor(_class2.prototype, 'onVimEnter'), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, 'keepRestore', [_dec3], Object.getOwnPropertyDescriptor(_class2.prototype, 'keepRestore'), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, 'onBufWrite', [_dec4], Object.getOwnPropertyDescriptor(_class2.prototype, 'onBufWrite'), _class2.prototype)), _class2)) || _class);
exports.default = TestPlugin;
# Keep.nvim

Save file content to redis for later restore after saving the file.

Your files could be accidently removed (by something like `rm -rf` `git reset`),
you can't get it back easily unless you have swap file, but no one want to have
swap file in their code base, so keep.nvim comes for help, it automatic store
file content associate with file path into redis, and you could restore them by
a simple command.

## Prerequirement

* [redis](https://redis.io/) server.
* [nodejs](http://nodejs.org/) >= `0.9.0`
* [neovim](https://github.com/neovim/neovim) >= `0.2.2`

## Usage

* `:KeepRestore [filepath]` restore the content of current file or filepath
  resolved from CWD of neovim.

## Configuration

* `g:nvim_keep_redis_host`, default to `127.0.0.1`
* `g:nvim_keep_redis_port`, default to `6379`
* `g:nvim_keep_redis_expire`, default to `5*24*3600` (5 days)

## License

MIT

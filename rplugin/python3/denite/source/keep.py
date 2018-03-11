from ..kind.file import Kind as File
from os.path import expanduser
from .base import Base

class Source(Base):

    def __init__(self, vim):
        Base.__init__(self, vim)
        self.name = 'keep'
        self.kind = Kind(vim)
        self.home = expanduser('~')
        self.cwd = vim.eval('getcwd()') + '/'
        self.sorters = []

    def gather_candidates(self, context):
        items = self.vim.eval('KeepRemovedFiles()')
        return [{'word': x.replace(self.home, '~'), 'action__path': x} for x in items]

class Kind(File):
    def __init__(self, vim):
        super().__init__(vim)
        self.name = 'file/removed'
        self.persist_actions = ['reset']
        self.redraw_actions += ['reset']

    def action_reset(self, context):
        for target in context['targets']:
            path = target['action__path']
            p = self.vim.eval('fnameescape("' + path + '")')
            self.vim.command('KeepRestore ' + p)

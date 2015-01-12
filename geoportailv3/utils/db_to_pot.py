from pyramid.paster import bootstrap
env = bootstrap('development.ini')

from c2cgeoportal.models import DBSession, TreeItem
from os import path
import codecs


pathToPotFiles='./geoportailv3/locale/'
p = path.join(pathToPotFiles,"geoportailv3-db.pot")

if __name__ == "__main__":
    w = codecs.open(p, 'w', encoding='utf-8')
    w.write('#, fuzzy\nmsgid ""\nmsgstr ""\n"Plural-Forms: nplurals=2; plural=(n > 1)\\n"\n"MIME-Version: 1.0\\n"\n"Content-Type: text/plain; charset=utf-8\\n"\n"Content-Transfer-Encoding: 8bit\\n"\n\n')
    for type,id,name in DBSession.query(TreeItem.item_type, TreeItem.id, TreeItem.name):
        w.write('#: %s.%s\n' % (type, id))
        w.write('msgid "%s"\nmsgstr "%s"\n\n' % (name.replace('"','\\"'),""))
    print "DB Pot file updated: %s" % p

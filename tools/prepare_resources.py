"""Build the offline SQLite dictionary from upstream ECDICT CSV.
Usage: python3 tools/prepare_resources.py /path/to/ecdict.csv
Download source separately: https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv
This command performs no network requests. prepare_audio.py builds the recordings.
"""
from pathlib import Path
import csv,sqlite3,json,re,argparse
ROOT=Path(__file__).resolve().parents[1];ASSETS=ROOT/'app/src/main/assets'
def main():
 p=argparse.ArgumentParser();p.add_argument('csv');a=p.parse_args();path=ASSETS/'dictionary.db';path.unlink(missing_ok=True);db=sqlite3.connect(path)
 db.executescript('CREATE TABLE entries(word TEXT PRIMARY KEY,phonetic TEXT,zh TEXT,en TEXT,exchange TEXT); CREATE TABLE forms(form TEXT,lemma TEXT, PRIMARY KEY(form,lemma));')
 for r in csv.DictReader(open(a.csv,encoding='utf-8')):
  if not re.fullmatch(r"[A-Za-z][A-Za-z'-]*",r['word']):continue
  word=r['word'].lower();db.execute('INSERT OR IGNORE INTO entries VALUES(?,?,?,?,?)',(word,r['phonetic'],r['translation'].replace('\\n','\n'),r['definition'].replace('\\n','\n'),r['exchange']))
  for x in r['exchange'].split('/'):
   if ':' not in x:continue
   kind,forms=x.split(':',1)
   for form in forms.split(','):
    if not re.fullmatch(r"[a-zA-Z][a-zA-Z'-]*",form):continue
    if kind=='0':db.execute('INSERT OR IGNORE INTO forms VALUES(?,?)',(word,form.lower()))
    elif kind in ('p','d','i','3','r','t','s'):db.execute('INSERT OR IGNORE INTO forms VALUES(?,?)',(form.lower(),word))
 db.commit();db.execute('VACUUM');count=db.execute('SELECT count(*) FROM entries').fetchone()[0];db.close()
 manifest=ASSETS/'audio/manifest.json';stats={'dictionaryEntries':count,'dictionaryBytes':path.stat().st_size,'recordings':len(json.loads(manifest.read_text())) if manifest.exists() else 0,'audioBytes':sum(p.stat().st_size for p in (ASSETS/'audio').glob('*.ogg'))};(ASSETS/'resource-stats.json').write_text(json.dumps(stats,indent=2));print(stats)
if __name__=='__main__':main()

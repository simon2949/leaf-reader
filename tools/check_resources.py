"""Verify bundled bytes and database consistency; this is not a licence audit."""
from pathlib import Path
import hashlib,json,sqlite3,sys
from check_audio import check as check_audio
ROOT=Path(__file__).resolve().parents[1];ASSETS=ROOT/'app/src/main/assets'
def main():
 check_audio(ASSETS)
 manifest=json.loads((ROOT/'docs/resource-manifest.json').read_text());errors=[]
 for name,info in manifest.items():
  file=ASSETS/name
  if not file.is_file():errors.append('missing '+name);continue
  data=file.read_bytes()
  if len(data)!=info['bytes'] or hashlib.sha256(data).hexdigest()!=info['sha256']:errors.append('changed '+name)
 actual={str(p.relative_to(ASSETS)) for p in ASSETS.rglob('*') if p.is_file()}
 errors.extend('unlisted '+n for n in sorted(actual-set(manifest)))
 if not errors:
  with sqlite3.connect(f'file:{ASSETS / "dictionary.db"}?mode=ro',uri=True) as db:
   if db.execute('PRAGMA quick_check').fetchone()[0]!='ok':errors.append('database quick_check failed')
   count=db.execute('SELECT count(*) FROM entries').fetchone()[0]
  stats=json.loads((ASSETS/'resource-stats.json').read_text())
  if count!=stats['dictionaryEntries']:errors.append('dictionary count differs from stats')
  audio=json.loads((ASSETS/'audio/manifest.json').read_text())
  if len(audio)!=stats['recordings']:errors.append('recording count differs from stats')
 if errors:print('\n'.join(errors),file=sys.stderr);return 1
 print(f'PASS {len(manifest)} resource hashes and SQLite consistency. Licence clearance is separate.');return 0
if __name__=='__main__':sys.exit(main())

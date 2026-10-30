"""Export an allowlisted, local review snapshot. This does not publish anything."""
from pathlib import Path
import argparse,hashlib,json,zipfile
ROOT=Path(__file__).resolve().parents[1]
ROOT_FILES={'README.md','LICENSE','THIRD_PARTY_NOTICES.md','CONTRIBUTING.md','SECURITY.md','PRIVACY.md','CHANGELOG.md','ROADMAP.md','package.json','package-lock.json','build.gradle','settings.gradle','gradle.properties','gradlew','gradlew.bat','.gitignore','.gitattributes'}
DIRS={'.github','app','docs','gradle','tests','tools','third_party'}
EXCLUDED={'build','node_modules','__pycache__','.gradle','.git','.aws','.codex','.agents','outputs'}
def candidates(root=ROOT):
 for p in sorted(root.rglob('*')):
  if not p.is_file():continue
  rel=p.relative_to(root)
  if any(part in EXCLUDED for part in rel.parts):continue
  if len(rel.parts)==1 and rel.name not in ROOT_FILES:continue
  if len(rel.parts)>1 and rel.parts[0] not in DIRS:continue
  if p.suffix in {'.jks','.keystore','.log','.pyc','.apk','.aab'} or p.name.startswith('.env'):continue
  if p.is_symlink():raise ValueError('Symlink not permitted in export: '+str(rel))
  yield p,rel.as_posix()
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--output',default='outputs/leaf-private-review-source.zip');args=parser.parse_args();target=Path(args.output).resolve();target.parent.mkdir(parents=True,exist_ok=True)
 manifest=[]
 with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for p,rel in candidates():
   data=p.read_bytes()
   if any((b'-----BEGIN '+kind+b'PRIVATE KEY-----') in data for kind in (b'',b'RSA ',b'EC ',b'OPENSSH ',b'ENCRYPTED ')):raise ValueError('Private key detected in '+rel)
   info=zipfile.ZipInfo('leaf-reader/'+rel);info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=(p.stat().st_mode & 0xffff)<<16
   z.writestr(info,data);manifest.append({'path':rel,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
  z.writestr('leaf-reader/EXPORT-MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2))
 digest=hashlib.sha256(target.read_bytes()).hexdigest();target.with_suffix(target.suffix+'.sha256').write_text(digest+'  '+target.name+'\n')
 print(f'Created local PRIVATE-REVIEW archive: {target.name}; {len(manifest)} files; {target.stat().st_size} bytes.')
 print('Not cleared for public distribution. Read docs/open-source-guide.md and run npm run check:release.')
if __name__=='__main__':main()

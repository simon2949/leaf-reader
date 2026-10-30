"""Verify the offline engine's supplied preferred sources and their runtime relationship."""
from pathlib import Path
import hashlib,json,base64,re
ROOT=Path(__file__).resolve().parents[1];BUNDLE=ROOT/'third_party/offline-speech'
def digest(data):return hashlib.sha256(data).hexdigest()
def main():
 manifest=json.loads((BUNDLE/'SOURCES.json').read_text())
 for name,item in manifest['files'].items():
  file=BUNDLE/name;assert file.is_file(),name;data=file.read_bytes();assert len(data)==item['bytes'] and digest(data)==item['sha256'],name
 runtime=ROOT/'app/src/main/assets/web/vendor/mespeak'
 voice=json.loads((runtime/'en-us.json').read_text());assert (runtime/'en-us.json').read_bytes()==(BUNDLE/'mespeak/en-us.json').read_bytes()
 config=json.loads((BUNDLE/'mespeak/mespeak__standard_config.json').read_text());matches={}
 for name in ['config','phontab','phonindex','phondata','intonations']:
  decoded=base64.b64decode(config[name]);assert decoded==(BUNDLE/'speak.js/espeak-data'/name).read_bytes(),name;matches[name]=digest(decoded)
 for field,name in [('dict','en_dict'),('voice','voices/en/en-us')]:
  decoded=base64.b64decode(voice[field]);assert decoded==(BUNDLE/'speak.js/espeak-data'/name).read_bytes(),name;matches[name]=digest(decoded)
 current=(runtime/'mespeak-core.js').read_text().splitlines();upstream=(BUNDLE/'mespeak/official-2.0.7-core.js').read_text().splitlines();assert len(current)==len(upstream)==140
 changed=[i for i,(a,b) in enumerate(zip(current,upstream),start=1) if a!=b];assert changed==[2,97],changed
 assert current[1].strip()=='meSpeak-core  v.2.0.6' and upstream[1].strip()=='meSpeak-core  v.2.0.7'
 assert current[96].replace('recoverFromFSError(message)','recoverFromFSError(message,auto)').replace("console.log('meSpeak -- recovering from error:',message)","console.log('meSpeak'+(auto?'':' -- recovering from error')+':',message)")==upstream[96]
 generated=next(line for line in current if line.startswith('var meSpeakCore='));assert generated==next(line for line in upstream if line.startswith('var meSpeakCore='))
 full=(BUNDLE/'mespeak/mespeak-core.full.js').read_text();refs={}
 for line,name in re.findall(r'//@line (\d+) "([^"]+)"',full):
  filename=name.removeprefix('./');source=BUNDLE/'speak.js/src'/filename;assert source.is_file(),name;refs[filename]=max(int(line),refs.get(filename,0))
 for name,last in refs.items():assert last<=len((BUNDLE/'speak.js/src'/name).read_text().splitlines()),(name,last)
 assert (BUNDLE/'espeakedit/phsource/phonemes').is_file();assert (BUNDLE/'espeakedit/src/compiledata.cpp').is_file()
 report={'suppliedSourceFiles':len(manifest['files']),'runtimeDifferentLines':changed,'generatedEngineLineSha256':digest(generated.encode()),'dataSha256':matches,'cppDebugReferenceFiles':len(refs),'phonemePreferredSourcesIncluded':True}
 out=ROOT/'outputs/speech-source';out.mkdir(parents=True,exist_ok=True);(out/'provenance.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS engine source hashes, exact config/dictionary/US-voice data, two-line wrapper difference, C++ debug references and phoneme source presence')
if __name__=='__main__':main()

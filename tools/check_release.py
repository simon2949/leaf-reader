"""Report unresolved, evidence-backed checks for the selected distribution target."""
from pathlib import Path
import argparse,json,sys,subprocess
ROOT=Path(__file__).resolve().parents[1]
def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('--target',choices=['source','apk','production-apk'],default='source')
 target=parser.parse_args().target
 data=json.loads((ROOT/'docs/release-readiness.json').read_text())
 required={'audio-licence','mespeak-corresponding-source','repository-owner','historical-audio-distribution'}
 if target=='production-apk':required.add('release-signing')
 checks={x['id']:x for x in data['checks']}
 missing=required-checks.keys()
 if missing:print('Missing required checks: '+', '.join(sorted(missing)),file=sys.stderr);return 1
 pending=[checks[key] for key in sorted(required) if checks[key]['status']!='resolved' or not checks[key].get('evidence')]
 if pending:
  print(f'PUBLIC {target.upper()} RELEASE NOT READY:')
  for x in pending:print(f"- {x['id']}: {x['reason']}")
  print('See docs/open-source-guide.md. Build/test success does not clear these items.');return 1
 if subprocess.run([sys.executable,str(ROOT/'tools/check_audio.py')]).returncode:return 1
 if checks['mespeak-corresponding-source']['status']=='resolved':
  if subprocess.run([sys.executable,str(ROOT/'tools/check_speech_source.py')]).returncode:return 1
 print(f'Documented checks for {target} resolved; verify the evidence and final contents before publishing.');return 0
if __name__=='__main__':sys.exit(main())

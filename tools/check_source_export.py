"""Check that an exported review snapshot excludes machine/private data."""
import sys,zipfile
from pathlib import PurePosixPath
path=sys.argv[1] if len(sys.argv)>1 else 'outputs/leaf-private-review-source.zip'
with zipfile.ZipFile(path) as z:
 names=z.namelist()
 forbidden={'.git','.aws','.codex','.agents','.gradle','node_modules','outputs','__pycache__','build'}
 for name in names:
  p=PurePosixPath(name)
  assert not any(part in forbidden for part in p.parts),name
  assert p.name!='local.properties' and not p.name.startswith('.env'),name
  assert p.suffix not in {'.keystore','.jks','.apk','.aab'},name
 for required in ['gradlew','gradle/wrapper/gradle-wrapper.jar','README.md','LICENSE','package-lock.json','.github/workflows/verify.yml','docs/release-readiness.json']:
  assert 'leaf-reader/'+required in names,required
print('PASS archive allowlist and required build/documentation files. Git history is not included or audited.')

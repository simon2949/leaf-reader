"""Check every reachable Git object in the independent public history."""
from pathlib import Path
import argparse, subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--repo', required=True)
repo = Path(parser.parse_args().repo).resolve()
def git(*args):
    return subprocess.check_output(['git', '-C', str(repo), *args])

objects = git('rev-list', '--objects', '--all').decode().splitlines()
for entry in objects:
    sha, _, name = entry.partition(' ')
    if name.startswith('app/src/main/assets/audio/'):
        assert name == 'app/src/main/assets/audio/manifest.json', name
        assert git('cat-file', '-p', sha).strip() == b'{}', 'Historical recording metadata found'
    assert not name.startswith('app/src/main/assets/licenses/Shtooka'), name
    assert name != 'tools/prepare_audio.py', name
    assert not any(part in {'.aws', '.codex', '.agents', 'outputs', 'node_modules'} for part in Path(name).parts), name
    assert Path(name).suffix not in {'.keystore', '.jks', '.apk', '.aab'}, name
    assert Path(name).name != 'local.properties', name
    if git('cat-file', '-t', sha).strip() == b'blob':
        data = git('cat-file', '-p', sha)
        for kind in (b'', b'RSA ', b'EC ', b'OPENSSH ', b'ENCRYPTED '):
            assert b'-----BEGIN ' + kind + b'PRIVATE KEY-----' not in data, name
print(f'PASS {len(objects)} reachable Git objects: no retired word audio, private keys or machine data')

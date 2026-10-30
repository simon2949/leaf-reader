"""Prevent accidentally redistributing the retired human recording collection."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

def check(assets):
    assert json.loads((assets/'audio/manifest.json').read_text()) == {}, 'Bundled recordings require a new per-file licence audit'
    assert {p.name for p in (assets/'audio').iterdir()} == {'manifest.json'}, 'No human audio may be bundled without a new per-file audit'
    assert not list((assets/'licenses').glob('Shtooka*')), 'Retired collection metadata must not be bundled'
    stats = json.loads((assets/'resource-stats.json').read_text())
    assert stats['recordings'] == stats['audioBytes'] == 0

if __name__ == '__main__':
    check(ROOT/'app/src/main/assets')
    print('PASS no bundled human recordings or retired collection metadata; offline synthesis remains separate')

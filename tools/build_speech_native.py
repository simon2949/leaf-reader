"""Build the supplied eSpeak C++ snapshot for Linux, without changing its source files."""
from pathlib import Path
import argparse,shutil,subprocess,os
ROOT=Path(__file__).resolve().parents[1]
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--output',default='outputs/speech-native');args=parser.parse_args();out=(ROOT/args.output).resolve()
 source=ROOT/'third_party/offline-speech/speak.js'
 if out==source or source in out.parents:raise ValueError('Build outside the vendored source directory')
 if out.exists():
  raise ValueError('Output already exists; choose a fresh --output directory to preserve previous results')
 shutil.copytree(source,out)
 # The 2012 Emscripten port suppresses timespec and wchar.h in its headers.
 # Pre-include the real host headers for native builds; do not alter the supplied sources.
 subprocess.run(['make','-j2','speak','CXX='+os.environ.get('CXX','g++'),'CXXFLAGS=-O2 -std=gnu++98 -include time.h -include wchar.h'],cwd=out/'src',check=True)
 print('Native engine: '+str(out/'src/speak'))
if __name__=='__main__':main()

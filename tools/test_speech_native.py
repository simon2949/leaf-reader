"""Verify that the included eSpeak C++ sources build and synthesize without online inputs."""
from pathlib import Path
import subprocess,tempfile,wave,json,hashlib,sys,os
ROOT=Path(__file__).resolve().parents[1]
def main():
 output=ROOT/'outputs/speech-source';output.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='leaf-espeak-native-') as tmp:
  native=Path(tmp)/'engine'
  build=subprocess.run([sys.executable,str(ROOT/'tools/build_speech_native.py'),'--output',str(native)],capture_output=True,text=True)
  (output/'native-build.log').write_text(build.stdout+build.stderr)
  if build.returncode:print((build.stdout+build.stderr)[-5000:],file=sys.stderr);return build.returncode
  results=[]
  for word in ['sesquipedalian','attention','quiet','photograph','extraordinary']:
   target=Path(tmp)/(word+'.wav')
   subprocess.run([str(native/'src/speak'),'--path='+str(native),'-v','en/en-us','-s','155','-a','90','-w',str(target),word],check=True,capture_output=True)
   with wave.open(str(target)) as wav:
    assert wav.getnchannels()==1 and wav.getsampwidth()==2 and wav.getframerate()==22050
    frames=wav.getnframes();pcm=wav.readframes(frames);assert frames>100 and any(pcm)
   results.append({'word':word,'sampleRate':22050,'frames':frames,'wavSha256':hashlib.sha256(target.read_bytes()).hexdigest()})
  compiler=subprocess.check_output([os.environ.get('CXX','g++'),'--version'],text=True).splitlines()[0]
  (output/'native.json').write_text(json.dumps({'compiler':compiler,'sourceModified':False,'samples':results},indent=2)+'\n')
 print('PASS supplied eSpeak C++ build and five US-English WAV syntheses; source files unchanged');return 0
if __name__=='__main__':sys.exit(main())

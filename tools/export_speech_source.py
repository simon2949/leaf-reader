"""Package the v0.1.12 speech engine's sources and reproducible verification commands."""
from pathlib import Path
import json,zipfile,hashlib
ROOT=Path(__file__).resolve().parents[1]
def main():
 source=ROOT/'third_party/offline-speech';target=ROOT/'outputs/leaf-speech-corresponding-source-v0.1.12.zip';manifest=[]
 entries=[(p,'third_party/offline-speech/'+p.relative_to(source).as_posix()) for p in sorted(source.rglob('*')) if p.is_file() and 'node_modules' not in p.parts and '__pycache__' not in p.parts]
 for name in ['tools/build_speech_source.cjs','tools/build_speech_native.py','tools/check_speech_source.py','tools/test_speech_native.py','tests/speech-source.cjs','docs/offline-speech.md','docs/offline-speech-evidence.json','app/src/main/assets/web/vendor/mespeak/mespeak.js','app/src/main/assets/web/vendor/mespeak/mespeak-core.js','app/src/main/assets/web/vendor/mespeak/en-us.json']:
  entries.append((ROOT/name,name))
 entries.extend([(source/'rebuild/package.json','package.json'),(source/'rebuild/package-lock.json','package-lock.json'),(source/'COPYING','LICENSE')])
 readme='''# Leaf v0.1.12 离线合成引擎对应源码\n\n这是引擎源码，不是 Android 安装包。用于当前 APK 内 meSpeak/eSpeak 的阅读、修改和重建验证，不含 App 的常用词真人发音录音集。\n\n安装 Node.js 20+、Python 3，在本目录执行：\n\n```sh\nnpm ci --ignore-scripts\nnpm run check:speech\nnpm run test:speech\n```\n\nLinux 上安装 make/g++ 后，可执行 `npm run test:speech-native`。全部重建输出到 outputs/，不会替换附带的原始运行文件。\n\n详细来源、步骤和重建范围见 `third_party/offline-speech/README.md`、`docs/offline-speech.md`。保留的原始 C++/音素源文件与许可在 third_party/offline-speech/。96 次 WAV 等价检查针对可读 JS 的重建结果；不要把它误称为旧 LLVM/Emscripten 的端到端比特级复现。\n'''
 target.parent.mkdir(exist_ok=True)
 with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for file,name in entries:
   data=file.read_bytes();assert '..' not in Path(name).parts
   z.writestr('leaf-speech-source/'+name,data);manifest.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
  z.writestr('leaf-speech-source/README.md',readme)
  z.writestr('leaf-speech-source/SOURCE-PACK-MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 digest=hashlib.sha256(target.read_bytes()).hexdigest();target.with_suffix('.zip.sha256').write_text(digest+'  '+target.name+'\n')
 print(f'Created {target.name}: {len(manifest)} files, {target.stat().st_size} bytes; SHA-256 {digest}')
if __name__=='__main__':main()

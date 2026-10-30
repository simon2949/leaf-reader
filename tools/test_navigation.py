"""Run the native navigation policy assertions without an Android device."""
from pathlib import Path
import subprocess,tempfile
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='leaf-navigation-') as out:
 subprocess.run(['javac','-d',out,str(ROOT/'app/src/main/java/com/leafreader/app/NavigationPolicy.java'),str(ROOT/'tests/NavigationPolicyTest.java'),str(ROOT/'app/src/main/java/com/leafreader/app/AssetMime.java'),str(ROOT/'tests/AssetMimeTest.java'),str(ROOT/'app/src/main/java/com/leafreader/app/AudioPolicy.java'),str(ROOT/'tests/AudioPolicyTest.java')],check=True)
 subprocess.run(['java','-ea','-cp',out,'com.leafreader.app.NavigationPolicyTest'],check=True)
 subprocess.run(['java','-ea','-cp',out,'com.leafreader.app.AssetMimeTest'],check=True)

 subprocess.run(['java','-ea','-cp',out,'com.leafreader.app.AudioPolicyTest'],check=True)

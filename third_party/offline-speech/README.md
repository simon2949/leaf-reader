# 离线合成引擎对应源码

本目录补齐 Leaf v0.1.12 已使用的 meSpeak/eSpeak 资料。应用运行文件和美音数据没有改变，也没有加入 APK：此处是供阅读、修改、构建和分发的源码资料。

## 来源与版本

- `mespeak/`：作者官方 meSpeak 2.0.7 包中的未压缩前端、未压缩核心、标准配置、美音 JSON，以及用于核对的官方压缩核心。来源和下载包 SHA-256 见 `SOURCES.json`。
- `mespeak/core-2.0.6.patch`：把官方未压缩核心对应到当前包内 2.0.6 包装层的可读补丁，仅改版本注释和错误日志。真正生成的 eSpeak 计算代码与官方 2.0.7 压缩核心完全相同。
- `speak.js/`：上游 commit `86c3779b7baccd68386bff3776c98103bb4cef1d` 的 eSpeak 1.45.04 C++、原始 Emscripten 移植脚本、发音词典源文件、数据输入和说明。它保留了当前生成核心引用的 `getopt.cpp` 等文件。21 个 C++ 调试引用文件均存在且行号有效。
- `espeakedit/`：原作者 eSpeakEdit 1.45.04 的源代码、`phsource` 音素定义、原始样本、相关源码和文档。它补齐了普通 eSpeak 源码 ZIP 未包含的音素数据编辑／编译资料。
- `COPYING` 与各上游 `License.txt`：保留 GPL 原文。上游程序及源码文件里的版权声明不作删除；上游带的可执行程序和编译产物没有复制进来。

`SOURCES.json` 记录下载来源、原始包哈希及逐文件哈希。这里的 hash 说明已保存文件的身份，不代表重新签发第三方许可。

## 如何核对与重建

在完整 Leaf 仓库根目录运行（Node.js 20+、Python 3）：

```sh
npm ci --ignore-scripts
npm run check:speech
npm run build:speech
npm run test:speech
```

重建命令将可读 JS 按可见的两处包装层差异还原，再使用锁定的 Terser 5.44.1 删除无关空白／注释，不压缩计算表达式、不重命名变量，输出到 `outputs/speech-source/`。不会覆盖已经测试过的 App 资源。不同压缩方式生成的文件大小不同；这些重建文件仅用于验证对应源码，不会被塞进安装包。

`test:speech` 在旧核心与重建核心之间比较 96 次完整 WAV，覆盖 12 组文本、美国英语、拉丁字符、标点及第 80 次调用附近的自动重启。结果逐字节一致，不只检查“接口没有报错”。

Linux 安装 `make` 和 `g++` 后，运行：

```sh
npm run test:speech-native
# 或保留构建目录供修改试验：
python3 tools/build_speech_native.py --output outputs/my-espeak-native
```

原生构建在复制的源码上执行 Makefile，使用 `-include time.h -include wchar.h` 兼容现代系统头文件，不修改原始 C++。随后验证五个美音 WAV 的采样率和非空数据。原生编译的波形不作为与旧 JavaScript 逐字节一致的证明。

在已安装浏览器的完整项目中，`node tools/run_browser_tests.cjs speech` 还会把重建前端和核心接入真实页面，触摸喇叭，检查离线 WebAudio 输出及没有外部资源请求。

## 重建范围说明

这里分别验证了两条实际可执行的路径：可读 meSpeak JS → 等效 Web 核心，以及 eSpeak C++ → 原生合成程序。2012 年原始 Emscripten 脚本保留在 `speak.js/src/emscripten.sh`，其中作者本机路径和当时工具接口见原文；本轮没有恢复整套历史 LLVM/Emscripten 环境，也不宣称已从 C++ 逐字节复刻原作者的 JavaScript 文件。不要把现代 minifier 重建误称为 C++ 的端到端交叉编译。

当前资料补齐了可修改 JS、其底层 C++、词典／音素输入和原有构建资料，并通过精确的数据核对及 JS 音频回归确认对应关系。有关工程证据和限制见项目 `docs/offline-speech.md`。

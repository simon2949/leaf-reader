# 离线合成引擎源码追溯与补齐（2026-10-30）

## 结论

本次补齐 Leaf v0.1.12 现有 meSpeak/eSpeak 的对应源码、数据源、许可、来源哈希和构建验证，不更换合成引擎、不更换美音数据、不修改应用或 APK。仅源码仓库和分发资料增加内容；手机无需重新安装。

此前“前端 2.0.7、核心注释 2.0.6”的记录不完整。核对官方 ZIP 后，140 行压缩核心中仅两行不同：第 2 行版本注释，以及第 97 行错误日志函数。包含整个生成 eSpeak 实现的代码行完全一致。这两处包装层差异现在有可见补丁和检查脚本。

## 来源证据

1. 官方 meSpeak 2.0.7 ZIP：SHA-256 `0f64d9659cff8551d16473b65fae6e02439292c249e0c2c76f602b16838e5156`。官方称其为 Source；包含未压缩前端、核心和标准配置。
2. 生成核心保留 eSpeak `1.45.04 25.Apr.11` 字符串，以及 C++ 文件／行号调试注释。
3. 当前美音 JSON 的声音定义与发音词典，加上标准配置、phontab、phonindex、phondata、intonations，共 7 份输入，与原作者 eSpeak 1.45.04 包中的文件逐字节一致。
4. C++ 移植源码固定到 speak.js commit `86c3779b7baccd68386bff3776c98103bb4cef1d`。原始 eSpeak 与移植源码的实质差异集中在宽字符／系统头兼容及一个未初始化变量修正；原始移植构建文件保留。生成 JS 引用的 21 个 C++ 文件均可定位，行号有效；这一检查是可追溯性证据，不单独当作数学等价证明。
5. 原作者 eSpeakEdit 1.45.04 的 phoneme 源数据和编译工具源码也已保存，避免只提供编译后的音素表。

完整上游地址、包 SHA-256、逐文件 SHA-256 在 [SOURCES.json](../third_party/offline-speech/SOURCES.json)；使用方式在 [源码目录说明](../third_party/offline-speech/README.md)。所有上游版权与许可原文保留。

## 已执行的验证

- 来源核查：导入源码哈希全部一致，7 份数据逐字节匹配，两行包装层差异受检查，C++ 调试文件引用和音素源文件齐全。
- 可读 JS 重建：Terser 5.44.1，禁用表达式压缩和变量改名，不依赖未记录的作者本机路径。
- 96 次合成：重建核心与当前已打包核心生成的完整 WAV 逐字节一致，包含超长词、大小写、标点、拉丁字符与自动重启路径，采样率 22050Hz，PCM 非空。
- 原生 C++ 构建：在现代 Linux 上从已提供源码生成 `speak`，不改原始文件，成功合成五个美音 WAV。
- 浏览器实际播放：重建前端／核心接入手机视口，通过生词本喇叭触摸触发离线回退，WebAudio 缓冲区含非零音频，不弹词卡，不请求外部资源。

机器可读结果见 [核查证据](offline-speech-evidence.json)。[GitHub 远程检查](https://github.com/simon2949/leaf-reader/actions/runs/40977782253) 已通过，包含来源／重建／C++、浏览器流程、Android 构建及 lint。导入源码通过 Git 属性保留原始换行字节，避免克隆后上游哈希变化。检查已加入 CI；源码或包内核心发生变化后需要重新核对，不能沿用这次结果。

## 限制与发布范围

本轮未重建原作者 2012 年 LLVM/Emscripten 工具环境，未宣称 C++ → JavaScript 的历史编译产物可逐字节复现。原生波形与旧 JavaScript 波形也没有被当成逐字节等同。精确音频对比发生在“可读 JS 重建的 Web 核心”与“当前包内 Web 核心”之间。

本项关闭的是工程中“合成引擎源码未随项目提供／版本对应关系不清”的待办，依据为完整资料、对应关系和实际构建／音频测试；不是对所有第三方材料作无限制再授权。v0.1.13 已另行移除内置真人录音包；旧 Git 历史及旧 Release 已隔离到私有归档，公开仓库从无录音快照开始，见 [公开记录](public-release.md)。

源码可以单独打包附在现有 v0.1.12 私有 Release 中，与同一个未改变的 APK 一起提供。现有发布标签保留，不重写历史、不重新签名。

官方来源：[meSpeak](https://www.masswerk.at/mespeak/)、[speak.js](https://github.com/kripken/speak.js/tree/86c3779b7baccd68386bff3776c98103bb4cef1d)、[eSpeak 1.45 系列发布](https://sourceforge.net/projects/espeak/files/espeak/espeak-1.45/)、[eSpeakEdit 音素编译说明](https://espeak.sourceforge.net/editor.html)。

源码附件：`leaf-speech-corresponding-source-v0.1.12.zip` 及其 `.sha256` 文件，附在现有 [v0.1.12 私有测试 Release](https://github.com/simon2949/leaf-reader-private-archive-20261030/releases/tag/v0.1.12)。APK 与既有版本标签保持原样。

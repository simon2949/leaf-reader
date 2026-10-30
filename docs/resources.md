# 内置资源与构建记录

> 运行时文件已随快照保存，但不等于所有输入都已固定、全部第三方源码都能重建。合成引擎源码和版本对应已补齐，见 [专项记录](offline-speech.md)；内置真人录音包已移除，旧分发历史已隔离，见 [核查记录](license-audit.md)。

离线运行所需的词典、字体、合成引擎随源码及 APK 提供。真人录音仅在用户播放单词时尝试联网获取，不随 APK 提供。`app/src/main/assets/resource-stats.json` 记录实际资源数量与大小。

## 阅读引擎与网页提取

- [Foliate.js](https://github.com/johnfactotum/foliate-js)，MIT，vendored snapshot。支持 EPUB、MOBI、KF8（AZW3）。源文件在 `app/src/main/assets/web/vendor/foliate/`。
- 本项目修改：阅读 iframe 去掉 `allow-scripts`（Android Chromium）；拒绝带加密标志的 MOBI 及不支持的 EPUB 加密算法，保留普通字体混淆支持；添加本地 zip.js 模块适配。
- [zip.js 2.7.57](https://github.com/gildas-lormeau/zip.js/tree/v2.7.57)，BSD-3-Clause；[fflate 0.8.2](https://github.com/101arrowz/fflate/tree/v0.8.2)，MIT。
- [Mozilla Readability 0.6.0](https://github.com/mozilla/readability/tree/0.6.0)，Apache-2.0。提取后仅保存正文文本，不执行网页脚本。

## 双语词典

[ECDICT](https://github.com/skywind3000/ECDICT)，上游 MIT 声明。下载其基础 `ecdict.csv`，保留单词、音标、中英文释义及词形变换，构建只读 SQLite。保留可点击单词形式，未收录所有短语或带标点条目。共有 401,818 条去重小写词条。

```sh
python3 tools/prepare_resources.py /path/to/ecdict.csv
```

SQLite 约 50.7 MiB，在 APK 内压缩，首次查词时复制到私有目录。释义和音标质量取决于上游，不宣称每个词都有美式音标或两种语言释义。

## 内置离线合成

[meSpeak.js](https://www.masswerk.at/mespeak/)，前端 2.0.7，当前 core 文件头为 2.0.6；基于 eSpeak / speak.js，GPL-3.0。保留 `mespeak.js`、`mespeak-core.js`、`en-us.json`。2.x 内置配置，不需要旧版 `mespeak_config.json`。上游完整下载入口：[mespeak.zip](https://www.masswerk.at/mespeak/mespeak.zip)。无需依赖 Android 系统 TTS 或额外下载声音。

对应源码、音素数据源、版本差异补丁和构建脚本现已保存在 `third_party/offline-speech/`。本轮未改 APK；详细范围和历史工具链复现限制见 [专项记录](offline-speech.md)。

## 真人美音（0.1.13）

原内置录音包的集合 README 与逐文件标签许可不一致，尚不能确认统一授权。按所有者要求，本版移除全部 3,002 条内置录音（8,177,272 bytes），以及集合许可副本、索引和 `prepare_audio.py` 批量导入脚本。少量单独来源录音也从安装包中移除，统一采用按需获取方式。`audio/manifest.json` 保留空对象以兼容开发适配器；资源统计为 0 条、0 bytes。

Android 优先使用许可及署名完整的私人缓存，否则在联网时向 Commons 请求 `File:En-us-单词.ogg` 的 imageinfo / extmetadata。只接受版本明确的 CC BY、CC BY-SA、CC0 或明确的公有领域标识，要求许可链接与名称对应、作者非空、来源为 Commons、音频为其上传域名；不接受 NC、ND、未注明版本或矛盾的标签。下载原始 Ogg，保留作者、标题、来源、许可、许可链接及未修改说明。缓存与源码／APK 分开，最多 50 MB，可手动清理。旧缓存也重新校验；不完整的缓存不播放，不自动将其视为已获许可。

录音不存在、许可资料不全、请求限流／超时、断网且无合规缓存时，返回前端使用随包提供的 meSpeak 美音合成，不依赖系统 TTS。Commons 覆盖有限，不保证每个词都有真人录音。浏览器开发预览不访问 Commons，默认使用离线合成；交互测试的录音由测试临时生成，不进入安装包。

`tools/check_audio.py` 和 `check_resources.py` 阻止旧录音包重新进入当前资源；Java 策略回归覆盖准确许可、署名和来源检查。若将来重新加入内置录音，必须先进行逐文件来源和许可核对，再更新该策略，不能恢复旧整包导入。

依据：[Commons 复用要求](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en)、[MediaWiki Imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo)、[Creative Commons 署名说明](https://creativecommons.org/reusing-cc-licensed-content/)。旧 Git 历史和旧 APK 已另存私有归档，公开仓库仅包含新快照，见 public-release.md。

## 内置阅读字体（0.1.4）

`web/fonts/` 保存未经修改的 TTF 文件，共约 3.3 MiB；APK 中压缩储存。Noto Serif / Sans、Liberation Serif / Sans / Mono、DejaVu Serif / Sans 共七个字体家族。各字体的常规字形随安装包提供；浏览器按需合成粗体或斜体。

取自构建环境 `/usr/share/fonts/truetype/{noto,liberation,dejavu}/` 的对应字体文件。上游来源分别为 Google Noto、Liberation Fonts 与 DejaVu Fonts。Noto 与 Liberation 按 SIL OFL 1.1 提供，DejaVu 按 Bitstream Vera 许可及 DejaVu 公有领域声明提供；完整版权与许可分别保留在 `licenses/Noto-fonts.txt`、`licenses/Liberation-fonts.txt`、`licenses/DejaVu-fonts.txt`。字体文件及版权说明的 SHA-256 记录于资源清单。

## 每日短语背景（0.1.11）

`web/images/daily/` 包含 8 张原创 SVG 风景插画，共 15,646 bytes。按本地日期每日轮换，8 天一轮；不联网取图，不使用第三方照片。源码可编辑，按应用自有代码的 GPL-3.0-only 许可提供，哈希记录在资源清单中。

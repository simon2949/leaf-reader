# 第三方组件与资源

应用自有代码按根目录 `LICENSE`（GPL-3.0-only）提供。以下组件、数据和素材保留各自许可；该清单不表示已完成所有资源的公开分发核查。未解决事项见 [核查记录](docs/license-audit.md)。许可原文保存在 `app/src/main/assets/licenses/`，也随应用提供。

| 组件／资源 | 来源与版本 | 许可原文 |
| --- | --- | --- |
| Foliate.js | [上游](https://github.com/johnfactotum/foliate-js)，vendored snapshot，确切提交待补录 | `Foliate.txt`、vendor/foliate/LICENSE：MIT |
| zip.js | [2.7.57](https://github.com/gildas-lormeau/zip.js/tree/v2.7.57) | `zip.js.txt`：BSD-3-Clause |
| fflate | [0.8.2](https://github.com/101arrowz/fflate/tree/v0.8.2) | `fflate.txt`：MIT |
| Mozilla Readability | [0.6.0](https://github.com/mozilla/readability/tree/0.6.0) | `Readability.txt`：Apache-2.0 |
| ECDICT | [基础 ecdict.csv](https://github.com/skywind3000/ECDICT)，导出为 SQLite，401,818 条 | `ECDICT.txt`：保留上游 MIT 声明；不将此声明扩大解释为对所有数据来源的独立保证 |
| meSpeak / eSpeak / speak.js | [meSpeak](https://www.masswerk.at/mespeak/)，前端 2.0.7；当前 core 文件头为 2.0.6 | `meSpeak-notice.txt`、`GPL-3.0.txt`：GPL；对应源码与构建验证已补齐，见 third_party/offline-speech/ 和 docs/offline-speech.md |
| Noto Serif / Sans | [Google Noto](https://notofonts.github.io/)，内置原始常规 TTF | `Noto-fonts.txt`：SIL OFL 1.1 |
| Liberation Serif / Sans / Mono | [Liberation Fonts](https://github.com/liberationfonts/liberation-fonts)，内置原始常规 TTF | `Liberation-fonts.txt`：SIL OFL 1.1 |
| DejaVu Serif / Sans | [DejaVu Fonts](https://dejavu-fonts.github.io/)，内置原始常规 TTF | `DejaVu-fonts.txt`：Bitstream Vera 许可及 DejaVu 公有领域声明 |

本地资源的字节数和 SHA-256 见 `docs/resource-manifest.json`。v0.1.13 起不再附带真人录音，`audio/manifest.json` 为空；原 Shtooka 包、索引和导入脚本已移除。联网获取的原始 Wikimedia Commons 录音按逐条许可使用，作者、来源、许可链接与未修改说明保存在应用私有缓存中，可在“关于与开源资源”查看；不将其统一改为 GPL。词典转换脚本位于 `tools/`。字体未修改；浏览器可合成粗体／斜体。

Foliate 本地修改包括移除阅读 iframe 的 `allow-scripts`、拒绝不支持的加密内容、ZIP 模块适配，以及阅读翻页与菜单交互适配；修改后的源码随仓库保留。网页提取后保存正文，不运行原网页脚本。

Gradle Wrapper、Android 构建工具、Java desugaring 和 Playwright 属于构建／开发依赖，版本分别由 Gradle 配置及 `package-lock.json` 固定。开发依赖没有作为运行时 JavaScript 打包进应用。生成 APK 时还应复核其依赖和最终分发内容。

每日短语的 8 张风景背景为项目原创 SVG 插画，位于 `web/images/daily/`，按 GPL-3.0-only 提供，不属于第三方照片素材。

离线合成源码补充：eSpeak 1.45.04（Jonathan Duddington）、speak.js Emscripten 移植（Alon Zakai 等，上游 AUTHORS）、meSpeak（Norbert Landsteiner）及 eSpeakEdit 1.45.04 的源码和原始许可保存在 `third_party/offline-speech/`。它们属于仓库内的对应源码材料，不是新增的安装包资源。

# 叶读 · Leaf

Android 本地英文阅读器：阅读小说与文章，点词查询英汉／英英释义，听美音，并把生词和原句保存在本地。

**当前测试版：v0.1.13。** 已完成个人使用所需的阅读、查词、发音与生词整理功能。后续继续改进格式兼容性与真机体验。

维护者：[simon2949](https://github.com/simon2949)。源码按 **GPL-3.0-only** 开源，第三方组件保留各自许可。公开版本从无内置真人录音的 v0.1.13 开始，包含离线合成引擎的 [对应源码与验证资料](docs/offline-speech.md)。

[下载 Android 测试版](https://github.com/simon2949/leaf-reader/releases/tag/v0.1.13) · [发布说明](docs/releases/v0.1.13.md) · [隐私说明](PRIVACY.md)


## 功能

- 分开的阅读首页与书架；继续阅读、每日短语和 8 张内置原创风景背景离线按日期轮换。
- 导入无 DRM 的 TXT、EPUB、MOBI、AZW、AZW3；HTTPS 网页提取后离线阅读，也可粘贴文章。
- 左右空白页边轻点、短距离滑动、可选音量键翻页，带短暂过渡；目录、书签、进度滑块和阅读位置自动保存。
- 七种内置英文字体，字号、行距、页边距、四种对齐方式；日间浅底黑字，夜间黑底白字；应用内亮度调节。
- 单击单词查词，突出原句和查询词；连字符两侧分别查词；收藏词及常见词形可显示下划线。
- 生词本支持书籍／标签筛选、搜索、排序、批量整理、多次遇见的原句及返回原书；筛选使用应用内选择面板，每个单词右下角可直接设置标签，喇叭直接播放。
- 本地 ZIP 备份与恢复，无账号、广告或统计 SDK。

<table><tr><td><img src="docs/images/reading.png" width="230" alt="阅读菜单"></td><td><img src="docs/images/settings.png" width="230" alt="阅读设置"></td><td><img src="docs/images/home.png" width="230" alt="每日短语风景背景"></td><td><img src="docs/images/vocabulary.png" width="230" alt="生词本"></td></tr></table>

截图为自创演示文章；页面随版本可能调整。更多变化见 [更新记录](CHANGELOG.md)。

## 离线资源与发音

安装包包含 401,818 条词典记录、七种字体和美音合成引擎，不附带真人录音。已有且署名许可完整的发音缓存优先；联网时尝试获取真人美音并保留作者、来源和许可，缺少录音、下载失败或离线无缓存时使用内置合成。首次使用离线合成无需下载资源。合成声音偏机械，多音词不自动按语境消歧。

来源、转换方式及许可原文见 [第三方声明](THIRD_PARTY_NOTICES.md)、[资源说明](docs/resources.md) 和 [核查记录](docs/license-audit.md)。应用代码采用 GPL-3.0-only；音频、字体等资源各自的许可需要分别遵守。

## 构建 Android 应用

需要 JDK 17、Android SDK Platform 35 和 Build Tools 35.0.0。设置 `ANDROID_HOME`，或在本机创建未纳入源码的 `local.properties`，填写 `sdk.dir=/你的/Android/SDK/路径`。

```sh
./gradlew :app:assembleDebug :app:lintDebug
```

Windows 使用 `gradlew.bat`。首次构建需要网络下载构建依赖；完整资源已经随源码提供。输出为 `app/build/outputs/apk/debug/app-debug.apk`，使用本机开发签名。Android 8.0 及以上可安装，需要可用且保持更新的 Android System WebView。不同电脑的开发签名可能不同，覆盖安装不一定成功；换签名前先导出应用内备份。

## 开发预览和测试

需要 Node.js 20 及以上、Python 3、JDK 17。

```sh
npm ci
npx playwright install chromium
npm test
python3 tools/test_navigation.py
npm run check:resources
npm run check:speech
npm run test:speech
npm run test:web
npm run test:formats
```

浏览器流程测试会自动启动和关闭本地服务。已有 Chrome 时可设置 `CHROME_PATH=/实际/chrome/路径`。手动预览运行 `npm run preview`，打开 `http://127.0.0.1:4173`。预览使用 IndexedDB 和 Python SQLite 服务；Android 使用原生私有存储，不依赖此服务。

[贡献指南](CONTRIBUTING.md) 说明测试环境、原生设备测试和项目结构。[验证记录](docs/validation.md) 区分已运行的检查与待完成的真机验收。GitHub Actions 执行核心、资源、合成、浏览器、格式和 Android 构建检查，不会自动发布 APK。

## 当前边界

不支持 PDF、KFX、AZW4、DRM 内容和需要登录／脚本才能提取的网页。单文件上限 80 MiB，备份解压上限 512 MiB。复杂或损坏电子书仍可能有兼容问题；小米 15 / HyperOS 等真实设备仍需验收。每日短语来自内置 60 条内容，并非联网生成。

数据只保存在本地；卸载前请在设置中导出备份。备份不加密，请自行妥善保管。在线发音和用户主动导入网页的网络行为见 [隐私说明](PRIVACY.md)。

## 参与项目

- [新手开源操作指南](docs/open-source-guide.md)
- [贡献指南](CONTRIBUTING.md) · [路线图](ROADMAP.md)
- [安全问题反馈方式](SECURITY.md)

源码与测试版公开提供。[v0.1.13 测试版下载页](https://github.com/simon2949/leaf-reader/releases/tag/v0.1.13) 提供 APK 与 SHA-256 校验文件，无需登录即可下载。测试包使用开发签名；正式生产签名仍在规划中。

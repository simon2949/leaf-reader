# 参与开发

先阅读 README、PRIVACY.md 和 docs/open-source-guide.md。项目已公开，开发环境与构建步骤也可参阅 [开发说明](docs/development.md)。新增资源仍需逐项核对来源与许可。

## 开发环境

- JDK 17、Android SDK Platform 35、Build Tools 35.0.0。
- Node.js 20 或更新版本（CI 使用 22）、Python 3。
- `npm ci --ignore-scripts` 安装锁定的开发依赖。
- `npx playwright install chromium` 安装浏览器；Linux 首次使用可运行 `npx playwright install --with-deps chromium`。

配置 ANDROID_HOME（或本地 local.properties 的 sdk.dir），不要提交本机路径。

```sh
npm test
python3 tools/test_navigation.py
npm run check:resources
npm run check:speech
npm run test:speech
npm run test:speech-native
npm run test:web
npm run test:formats
./gradlew :app:assembleDebug :app:lintDebug
```

浏览器测试命令会启动独立本地预览、选择空闲端口，并在结束后停止服务。测试输出放在被忽略的 outputs/。

可选环境变量：CHROME_PATH 指定已有 Chrome；PLAYWRIGHT_MODULE 指定已有 Playwright；PYTHON 指定 Python；ADB_PATH 或 ANDROID_HOME 指定 ADB；ANDROID_SERIAL 指定设备。Android 原生脚本需要预装 debug APK、准备相应测试书籍，并将 WebView 调试端口转发到 9222。仅在测试模拟器或明确授权设备上运行：部分脚本会导入书籍、修改生词与设置。

`tests/story-pack.cjs` 依赖自行下载的外部测试书籍，不属于默认 CI；不可上传受版权保护的整本小说。fixtures/ 下的自制小样本供基础格式回归。

## 修改要求

- 一次 PR 尽量解决一个问题，说明现象、修改行为和验证结果。
- 保持所有基本阅读、词典和离线语音资源可在最终安装包内使用。
- 不添加广告、遥测或上传书籍内容的行为。
- 修改阅读正文时注意 CFI 定位、分页与选字；优先使用覆盖层显示标记。
- 新资源需记录来源、明确许可、版本和校验值；修改第三方代码需保留声明并记录差异。
- 主源码按 GPL-3.0-only 提交；第三方资源保留各自许可，不要求贡献者转让版权。

提交前检查差异，避免意外加入签名文件、个人书籍、备份、缓存或环境文件。

离线语音的可读源码和原始 C++／音素输入在 `third_party/offline-speech/`。修改合成部分时运行源码校验与音频等价测试；原生验证需要 Linux make/g++。不要把 JS 压缩重建误写为历史 C++ 交叉编译复现。

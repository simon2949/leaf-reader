# 构建、预览与测试

本文面向希望自行构建或参与开发的读者。应用介绍与下载入口见 [README](../README.md)。

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

[贡献指南](../CONTRIBUTING.md) 说明测试环境、原生设备测试和项目结构。[验证记录](validation.md) 区分已运行的检查与待完成的真机验收。GitHub Actions 执行核心、资源、合成、浏览器、格式和 Android 构建检查，不会自动发布 APK。


# 0.1.12 修复 Android 每日短语背景不显示

## 原因与修复

0.1.11 的每日背景 SVG 已打包且浏览器预览正常，但 Android `shouldInterceptRequest` 没有指定 SVG 的 MIME，返回 `application/octet-stream`。WebView 请求能得到 200 响应，图片解码仍失败，卡片因此只剩底色与遮罩。

本版将打包 UI 的内容类型映射集中到 `AssetMime`，为 SVG 返回 `image/svg+xml`，保留原有脚本、样式、JSON、字体等响应类型及导航限制。没有改变图片、每日轮换规则、遮罩或用户数据格式。版本 0.1.12，versionCode 13。

## 验证

- Android 15 原生模拟器安装 0.1.11：8 张图片均返回 octet-stream，8 张均解码失败，复现用户截图中的纯底色问题。
- 在同一模拟器覆盖安装 0.1.12：8 张均返回 image/svg+xml，8 张全部解码成功；当前日期的背景实际应用到卡片。
- 保存并人工查看 Android WebView 的日间、夜间截图，均可看到风景图。模拟器的完整已保存状态在覆盖安装前后逐项一致。
- Java 断言测试新增全部背景路径的 MIME 检查，并检查已有 UI 类型及未知类型；与导航策略测试一同纳入现有验证命令和 CI。
- 核心测试、3,074 个资源哈希与 SQLite 检查、Android 构建、lint、APK 签名与包内资源哈希检查通过。

原生回归命令：先安装 debug APK、启动应用并转发 WebView 调试端口到 9222，然后执行 `node tests/android-daily-background.cjs`；旧版复现可加 `--expect-broken`。只在测试模拟器运行；脚本会切换主页和临时页面配色、保存截图，不改动应用存储。

证据位于被忽略的 `outputs/android-daily-before-results.json`、`outputs/android-daily-after-results.json` 及对应日夜截图。小米 15 真机仍需安装后确认；这次检查已使用真实 Android WebView，而非只验证桌面浏览器。

安装文件：`outputs/leaf-reader-0.1.12-debug.apk`，签名与此前测试版相同，可覆盖安装，无需卸载或清除数据。

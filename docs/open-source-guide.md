# 叶读的公开源码与下载

公开仓库：[simon2949/leaf-reader](https://github.com/simon2949/leaf-reader)。公开版本从 **v0.1.13** 开始，旧版含许可对应关系未核清的内置录音，因此不纳入公开仓库历史或 Release。

## 手机安装

打开 [v0.1.13 下载页](https://github.com/simon2949/leaf-reader/releases/tag/v0.1.13)，在 Assets 下载 `leaf-reader-0.1.13-debug.apk`。无需登录 GitHub。Source code ZIP 是源码，不能直接安装。

APK 沿用此前个人测试版的开发签名，可以覆盖安装；无需卸载。卸载会删除应用私有数据，建议先在设置导出备份。不同人自行构建的 debug APK 签名可能不同。

## 获取源码

```sh
git clone https://github.com/simon2949/leaf-reader.git
cd leaf-reader
```

构建与测试步骤见根目录 README。修改后先在自己的分支提交，保持第三方许可和完整源码。不要将旧私有仓库的历史合并回公开仓库。

## 历史隔离

2026-10-30 按所有者要求，原仓库改名为 `leaf-reader-private-archive-20261030` 并继续保持私有，保存旧提交、旧 APK 和自动依赖更新 PR。公开 `leaf-reader` 使用经过资源白名单检查的当前源码快照建立全新 Git 历史，不从旧仓库 fork，也不推送旧分支或标签。旧私有归档不是公开分发的一部分。

公开仓库只发布无内置真人录音的 v0.1.13 APK 和 SHA-256 文件，保留 GPL 对应源码。完整处置与检查见 [公开记录](public-release.md)。发布检查的 `production-apk` 目标仍保留正式签名规划待办；当前为开发签名测试版。

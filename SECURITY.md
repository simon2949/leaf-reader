# 安全问题反馈

请不要在公开 Issue 中附上私人书籍、个人备份、访问令牌、签名密钥或可直接攻击他人的材料。

仓库建立后，优先使用 GitHub 的 Security → Advisories → Report a vulnerability 私密报告入口。当前仓库为 [simon2949/leaf-reader](https://github.com/simon2949/leaf-reader)，仅对有权限的协作者开放。公开前需落实可用的私密报告入口；请勿将普通公开 Issue 当作私密渠道。

请提供：应用版本、Android 与 WebView 版本、影响范围、复现步骤，以及可公开授权的最小样本。崩溃日志需先移除姓名、文件名、URL 参数等私人信息。

重点边界：Android JavaScript 桥接、本地资源导航策略、不可信 EPUB/MOBI 文件解析与解压、网页提取、ZIP 备份恢复、资源耗尽及外部链接。

项目目前处于早期测试阶段，优先修复最新版本中的安全问题。尚未开展独立第三方安全审计，也不承诺固定响应时限。

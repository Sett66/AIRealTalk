# SingEngine 原生库（必填）

从 [智能科教平台](https://help.aliyun.com/zh/document_detail/2873524.html) 或先声开放平台下载 Android SDK 包，将 **在线版** `libbsound-3-android_*-SSL.so` 重命名为 `libssound.so`，放入对应目录：

```
jniLibs/
  arm64-v8a/libssound.so      # 真机（64 位）
  armeabi-v7a/libssound.so    # 旧真机（可选）
  x86_64/libssound.so         # 模拟器（可选）
```

未放置 `libssound.so` 时，App 会在评测阶段崩溃或报 `UnsatisfiedLinkError`。

Maven 依赖 `com.singsound.library:evaluating:2.1.9` 仅包含 Java 层，**不包含** `.so` 文件。

**纯在线评测**（本项目默认，`CLOUD` + 在线版 `libssound-3`）**不需要** `resource_en.zip`。

若改用 `AUTO` / 离线引擎，还需将 `resource_en.zip` 放入 `assets/`，否则会报错误码 `70014 Stream closed`。

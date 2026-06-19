package com.airealtalkmobile

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.Executors

class PronunciationEngineModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  private val executor = Executors.newSingleThreadExecutor()

  override fun getName(): String = "PronunciationEngine"

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(SingSoundNative.isLibraryLoaded())
  }

  @ReactMethod
  fun evaluateSentence(
      applicationId: String,
      userId: String,
      timestamp: String,
      sig: String,
      connectId: String,
      warrantId: String,
      refText: String,
      wavPath: String,
      expireAt: Double,
      promise: Promise,
  ) {
    executor.execute {
      try {
        if (!SingSoundNative.isLibraryLoaded()) {
          promise.reject(
              "PRONUNCIATION_UNAVAILABLE",
              "缺少 libssound.so，请按 mobile/android/app/src/main/jniLibs/README.md 配置 SingEngine 原生库",
          )
          return@execute
        }

        val score =
            SingEngineEvaluator.evaluateSentence(
                context = reactApplicationContext,
                applicationId = applicationId,
                userId = userId,
                warrantId = warrantId,
                expireAt = expireAt.toLong(),
                refText = refText,
                wavPath = wavPath,
            )
        promise.resolve(score)
      } catch (error: Throwable) {
        promise.reject("PRONUNCIATION_ERROR", error.message, error)
      }
    }
  }
}

package com.airealtalkmobile

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.constraint.AudioTypeEnum
import com.constraint.CoreProvideTypeEnum
import com.constraint.ResultBody
import com.xs.SingEngine
import com.xs.impl.ResultListener
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt
import org.json.JSONObject

object SingEngineEvaluator {
  private const val TAG = "SingEngineEvaluator"

  fun evaluateSentence(
      context: Context,
      applicationId: String,
      userId: String,
      warrantId: String,
      expireAt: Long,
      refText: String,
      wavPath: String,
  ): Int {
    if (!SingSoundNative.isLibraryLoaded()) {
      throw IllegalStateException(
          "缺少 libssound.so，请按 jniLibs/README.md 配置 SingEngine 原生库",
      )
    }

    val wavFile = File(normalizePath(wavPath))
    if (!wavFile.exists()) {
      throw IllegalStateException("WAV file not found: ${wavFile.absolutePath}")
    }

    Log.d(TAG, "evaluate refText=${refText.take(40)} path=${wavFile.absolutePath}")

    val readyLatch = CountDownLatch(1)
    val resultLatch = CountDownLatch(1)
    var score: Int? = null
    var errorMessage: String? = null
    var evaluationStarted = false
    val engine = SingEngine.newInstance(context.applicationContext)

    fun finishResult(message: String? = null) {
      if (message != null && errorMessage == null) {
        errorMessage = message
      }
      resultLatch.countDown()
    }

    engine.setListener(
        object : ResultListener {
          override fun onBegin() {
            Log.d(TAG, "onBegin")
          }

          override fun onResult(result: JSONObject) {
            Log.d(TAG, "onResult: ${result.toString().take(500)}")
            try {
              val resultNode = result.optJSONObject("result") ?: result
              val rawScore =
                  when {
                    resultNode.has("pron") -> resultNode.optDouble("pron")
                    resultNode.has("accuracy") -> resultNode.optDouble("accuracy")
                    resultNode.has("overall") -> resultNode.optDouble("overall")
                    resultNode.has("total") -> resultNode.optDouble("total")
                    result.has("pron") -> result.optDouble("pron")
                    result.has("overall") -> result.optDouble("overall")
                    else -> Double.NaN
                  }
              if (!rawScore.isNaN()) {
                score = rawScore.roundToInt().coerceIn(0, 100)
                finishResult()
              }
            } catch (error: Exception) {
              finishResult(error.message ?: "评测结果解析失败")
            }
          }

          override fun onEnd(body: ResultBody) {
            Log.d(TAG, "onEnd: code=${body?.code} msg=${body?.message}")
            if (!evaluationStarted) {
              Log.w(TAG, "onEnd during init ignored")
              return
            }
            if (score == null) {
              finishResult(body?.message ?: "阿里云口语评测结束但未返回分数")
            } else {
              finishResult()
            }
          }

          override fun onUpdateVolume(volume: Int) {}

          override fun onFrontVadTimeOut() {
            Log.w(TAG, "onFrontVadTimeOut")
            finishResult("评测前端静音超时")
          }

          override fun onBackVadTimeOut() {
            Log.w(TAG, "onBackVadTimeOut")
            finishResult("评测后端静音超时")
          }

          override fun onRecordingBuffer(data: ByteArray, size: Int) {}

          override fun onRecordLengthOut() {
            Log.w(TAG, "onRecordLengthOut")
            finishResult("录音时长超出限制")
          }

          override fun onReady() {
            Log.d(TAG, "onReady")
            readyLatch.countDown()
          }

          override fun onPlayCompeleted() {}

          override fun onRecordStop() {}
        },
    )

    engine.setAudioType(AudioTypeEnum.WAV)
    // 纯在线评测：避免 AUTO 模式解压 resource_en.zip（未放入 assets 会报 70014 Stream closed）
    engine.setServerType(CoreProvideTypeEnum.CLOUD)
    engine.setServerAPI("wss://api.cloud.ssapi.cn")
    engine.setAuthInfo(warrantId, expireAt)
    engine.setOpenVad(false, null)
    engine.disableVolume()
    engine.setConnectTimeout(15_000)
    engine.setServerTimeout(45_000)
    engine.setEnableWS(true)
    engine.switchLog(true, false)

    try {
      val cfgInit = engine.buildInitJson(applicationId, "")
      engine.setNewCfg(cfgInit)

      val mainHandler = Handler(Looper.getMainLooper())
      var initError: String? = null
      val initLatch = CountDownLatch(1)
      mainHandler.post {
        try {
          // "1" = 仅在线引擎，跳过离线资源包初始化（与官方示例一致）
          engine.createEngine("1")
        } catch (error: Exception) {
          initError = error.message ?: "SingEngine createEngine 失败"
          readyLatch.countDown()
          resultLatch.countDown()
        } finally {
          initLatch.countDown()
        }
      }
      initLatch.await(5, TimeUnit.SECONDS)
      initError?.let { throw IllegalStateException(it) }

      val engineReady = readyLatch.await(15, TimeUnit.SECONDS)
      if (!engineReady) {
        throw IllegalStateException("SingEngine 初始化超时（未收到 onReady）")
      }

      val request =
          JSONObject()
              .put("coreType", "en.sent.score")
              .put("refText", refText)
              .put("rank", 100)
      val startCfg = engine.buildStartJson(userId, request)
      engine.setStartCfg(startCfg)

      val startLatch = CountDownLatch(1)
      var startError: String? = null
      evaluationStarted = true
      mainHandler.post {
        try {
          engine.startWithPCM(wavFile.absolutePath)
        } catch (error: Exception) {
          startError = error.message ?: "SingEngine startWithPCM 失败"
          finishResult(startError)
        } finally {
          startLatch.countDown()
        }
      }
      startLatch.await(5, TimeUnit.SECONDS)
      startError?.let { throw IllegalStateException(it) }

      val completed = resultLatch.await(45, TimeUnit.SECONDS)
      if (!completed) {
        throw IllegalStateException("阿里云口语评测超时（45s）")
      }

      errorMessage?.let { throw IllegalStateException(it) }
      return score ?: throw IllegalStateException("阿里云口语评测未返回分数")
    } finally {
      val deleteLatch = CountDownLatch(1)
      try {
        Handler(Looper.getMainLooper()).post {
          try {
            engine.deleteSafe()
          } catch (_: Exception) {
            try {
              engine.delete()
            } catch (_: Exception) {
              // ignore native teardown errors
            }
          } finally {
            deleteLatch.countDown()
          }
        }
        deleteLatch.await(5, TimeUnit.SECONDS)
      } catch (_: Exception) {
        // ignore teardown timeout
      }
    }
  }

  private fun normalizePath(path: String): String {
    return if (path.startsWith("file://")) path.removePrefix("file://") else path
  }
}

package com.airealtalkmobile

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Handler
import android.os.Looper
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TtsPlayerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  private var audioTrack: AudioTrack? = null
  private var sampleRate = 16000
  private var totalFramesWritten = 0
  private var endPromise: Promise? = null
  private val mainHandler = Handler(Looper.getMainLooper())
  private var endPlaybackRunnable: Runnable? = null

  override fun getName(): String = "TtsPlayer"

  @ReactMethod
  fun startStream(rate: Int, promise: Promise) {
    try {
      stopInternal(resolvePending = false)
      sampleRate = rate
      val channelConfig = AudioFormat.CHANNEL_OUT_MONO
      val encoding = AudioFormat.ENCODING_PCM_16BIT
      val minBuffer = AudioTrack.getMinBufferSize(sampleRate, channelConfig, encoding)
      val bufferSize = minBuffer.coerceAtLeast(sampleRate * 2)

      val track =
          AudioTrack.Builder()
              .setAudioAttributes(
                  AudioAttributes.Builder()
                      .setUsage(AudioAttributes.USAGE_MEDIA)
                      .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                      .build(),
              )
              .setAudioFormat(
                  AudioFormat.Builder()
                      .setEncoding(encoding)
                      .setSampleRate(sampleRate)
                      .setChannelMask(channelConfig)
                      .build(),
              )
              .setTransferMode(AudioTrack.MODE_STREAM)
              .setBufferSizeInBytes(bufferSize)
              .build()

      audioTrack = track
      totalFramesWritten = 0
      track.play()
      promise.resolve(null)
    } catch (error: Exception) {
      stopInternal(resolvePending = true)
      promise.reject("STREAM_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun writeChunk(base64Pcm: String, promise: Promise) {
    try {
      val track =
          audioTrack ?: throw IllegalStateException("TTS stream not started")
      val pcm = Base64.decode(base64Pcm, Base64.DEFAULT)
      if (pcm.isEmpty()) {
        promise.resolve(null)
        return
      }

      var offset = 0
      while (offset < pcm.size) {
        val written = track.write(pcm, offset, pcm.size - offset)
        if (written < 0) {
          throw IllegalStateException("AudioTrack write failed: $written")
        }
        offset += written
      }

      totalFramesWritten += pcm.size / 2
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("WRITE_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun endStream(promise: Promise) {
    val track = audioTrack
    if (track == null || totalFramesWritten == 0) {
      stopInternal(resolvePending = true)
      promise.resolve(null)
      return
    }

    endPromise = promise
    val playbackHead = track.playbackHeadPosition.coerceAtLeast(0)
    val remainingFrames = (totalFramesWritten - playbackHead).coerceAtLeast(0)
    val delayMs = ((remainingFrames * 1000L) / sampleRate).coerceAtLeast(80) + 120

    endPlaybackRunnable =
        Runnable {
          finishPlayback()
        }
    mainHandler.postDelayed(endPlaybackRunnable!!, delayMs)
  }

  @ReactMethod
  fun stop(promise: Promise) {
    stopInternal(resolvePending = true)
    promise.resolve(null)
  }

  override fun invalidate() {
    stopInternal(resolvePending = false)
    super.invalidate()
  }

  private fun finishPlayback() {
    val promise = endPromise
    endPromise = null
    stopInternal(resolvePending = false)
    promise?.resolve(null)
  }

  private fun stopInternal(resolvePending: Boolean) {
    endPlaybackRunnable?.let { mainHandler.removeCallbacks(it) }
    endPlaybackRunnable = null

    if (resolvePending) {
      endPromise?.resolve(null)
    }
    endPromise = null

    audioTrack?.run {
      try {
        stop()
      } catch (_: Exception) {
      } finally {
        release()
      }
    }
    audioTrack = null
    totalFramesWritten = 0
  }
}

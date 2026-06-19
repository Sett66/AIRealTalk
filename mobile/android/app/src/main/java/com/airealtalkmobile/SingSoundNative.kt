package com.airealtalkmobile

import android.util.Log

object SingSoundNative {
  private const val TAG = "SingSoundNative"
  private var loadAttempted = false
  private var loadSucceeded = false

  fun isLibraryLoaded(): Boolean {
    if (loadAttempted) {
      return loadSucceeded
    }

    loadAttempted = true
    loadSucceeded =
        try {
          System.loadLibrary("ssound")
          true
        } catch (error: Throwable) {
          Log.e(TAG, "libssound.so not loaded: ${error.message}")
          false
        }
    return loadSucceeded
  }
}

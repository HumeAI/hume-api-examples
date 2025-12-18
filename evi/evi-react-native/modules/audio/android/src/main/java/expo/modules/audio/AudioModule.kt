package expo.modules.audio

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.os.Build
import android.util.Base64
import android.util.Log
import androidx.core.app.ActivityCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import java.io.ByteArrayInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.ConcurrentLinkedQueue
import kotlin.coroutines.CoroutineContext

class AudioModule : Module(), CoroutineScope {
    companion object {
        private const val NAME = "Audio"
        private const val TAG = "AudioModule"
        
        // Audio configuration constants
        const val SAMPLE_RATE = 44100
        const val CHANNELS = 1 // Mono for recording
        const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        const val BITS_PER_SAMPLE = 16 // For PCM_16BIT
        const val BUFFER_SIZE_FACTOR = 0.1 // 100ms buffers
        
        // Event names
        private const val EVENT_AUDIO_INPUT = "onAudioInput"
        private const val EVENT_ERROR = "onError"
    }

    // Coroutine context
    private val job = SupervisorJob()
    override val coroutineContext: CoroutineContext
        get() = Dispatchers.Default + job

    // Audio recording state
    private var audioRecorder: AudioRecord? = null
    private var recordingJob: Job? = null
    private var isMuted = false
    private var isRecording = false
    
    // Audio effects for voice processing
    private var echoCanceler: AcousticEchoCanceler? = null
    private var noiseSuppressor: NoiseSuppressor? = null
    
    // Audio playback state
    private var isPlaying = false
    private val audioQueue = ConcurrentLinkedQueue<ByteArray>()
    private var playbackJob: Job? = null
    private var audioTrack: AudioTrack? = null

    // Calculate buffer size based on sample rate
    private val recordBufferSize = (SAMPLE_RATE * BUFFER_SIZE_FACTOR).toInt() * CHANNELS * (BITS_PER_SAMPLE / 8)
    
    // Minimum buffer size based on the hardware capability
    private val minBufferSize = AudioRecord.getMinBufferSize(
        SAMPLE_RATE,
        if (CHANNELS == 1) AudioFormat.CHANNEL_IN_MONO else AudioFormat.CHANNEL_IN_STEREO,
        AUDIO_FORMAT
    )
    
    // Use the larger of our calculated buffer size or the minimum required buffer size
    private val actualRecordBufferSize = maxOf(recordBufferSize, minBufferSize)
    
    // Calculate playback buffer size
    private val minPlaybackBufferSize = AudioTrack.getMinBufferSize(
        SAMPLE_RATE,
        AudioFormat.CHANNEL_OUT_STEREO, // Always prepare for stereo
        AUDIO_FORMAT
    )
    
    // Use a larger buffer for playback to prevent underruns
    private val playbackBufferSize = maxOf(minPlaybackBufferSize * 2, 8192)

    override fun definition() = ModuleDefinition {
        Name(NAME)
        
        Constants(
            "sampleRate" to SAMPLE_RATE,
            "isLinear16PCM" to true
        )
        
        Events(EVENT_AUDIO_INPUT, EVENT_ERROR)
        
        AsyncFunction("getPermissions") { promise: Promise ->
            val activity = appContext.currentActivity
            if (activity == null) {
                promise.reject("ERR_ACTIVITY_NOT_FOUND", "Activity not found", null)
                return@AsyncFunction
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (ActivityCompat.checkSelfPermission(activity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    promise.resolve(true)
                } else {
                    ActivityCompat.requestPermissions(
                        activity,
                        arrayOf(Manifest.permission.RECORD_AUDIO),
                        123 // Request code (can be any number)
                    )
                    // Note: This is a simplified implementation. In a real app, you'd want to handle the permission result.
                    promise.resolve(false)
                }
            } else {
                // For pre-Marshmallow devices, permissions are granted during installation
                promise.resolve(true)
            }
        }
        
        AsyncFunction("startRecording") { promise: Promise ->
            if (isRecording) {
                promise.resolve(null)
                return@AsyncFunction
            }

            try {
                // Initialize the audio recorder
                audioRecorder = AudioRecord(
                    MediaRecorder.AudioSource.VOICE_COMMUNICATION, // Use VOICE_COMMUNICATION for echo cancellation
                    SAMPLE_RATE,
                    if (CHANNELS == 1) AudioFormat.CHANNEL_IN_MONO else AudioFormat.CHANNEL_IN_STEREO,
                    AUDIO_FORMAT,
                    actualRecordBufferSize
                )

                if (audioRecorder?.state != AudioRecord.STATE_INITIALIZED) {
                    promise.reject("ERR_RECORDING_INIT", "Failed to initialize AudioRecord", null)
                    return@AsyncFunction
                }
                
                // Set up audio processing effects if available
                audioRecorder?.let { recorder ->
                    // Try to enable echo cancellation
                    if (AcousticEchoCanceler.isAvailable()) {
                        try {
                            echoCanceler = AcousticEchoCanceler.create(recorder.audioSessionId)
                            echoCanceler?.enabled = true
                            Log.i(TAG, "Echo cancellation enabled: ${echoCanceler?.enabled}")
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to enable echo cancellation: ${e.message}")
                        }
                    }
                    
                    // Try to enable noise suppression
                    if (NoiseSuppressor.isAvailable()) {
                        try {
                            noiseSuppressor = NoiseSuppressor.create(recorder.audioSessionId)
                            noiseSuppressor?.enabled = true
                            Log.i(TAG, "Noise suppression enabled: ${noiseSuppressor?.enabled}")
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to enable noise suppression: ${e.message}")
                        }
                    }
                }

                // Start recording in a coroutine
                recordingJob = launch {
                    isRecording = true
                    audioRecorder?.startRecording()
                    
                    val buffer = ByteArray(actualRecordBufferSize)
                    
                    while (isRecording && isActive) {
                        val readSize = audioRecorder?.read(buffer, 0, buffer.size) ?: 0
                        
                        if (readSize > 0 && !isMuted) {
                            // Send only the data that was actually read
                            val audioData = if (readSize == buffer.size) buffer else buffer.copyOf(readSize)
                            val base64Data = Base64.encodeToString(audioData, Base64.NO_WRAP)
                            
                            // Emit the audio data event
                            sendEvent(EVENT_AUDIO_INPUT, mapOf("base64EncodedAudio" to base64Data))
                        } else if (readSize > 0 && isMuted) {
                            // When muted, send silent audio (zero-filled buffer)
                            val silentData = ByteArray(readSize)
                            val base64Silent = Base64.encodeToString(silentData, Base64.NO_WRAP)
                            sendEvent(EVENT_AUDIO_INPUT, mapOf("base64EncodedAudio" to base64Silent))
                        } else if (readSize < 0) {
                            sendEvent(EVENT_ERROR, mapOf("message" to "Error reading audio data"))
                            break
                        }
                        
                        delay(10) // Small delay to prevent CPU overuse
                    }
                    
                    // Clean up resources
                    try {
                        audioRecorder?.stop()
                    } catch (e: IllegalStateException) {
                        Log.e(TAG, "Error stopping AudioRecord: ${e.message}")
                    }
                    
                    // Release audio effects
                    echoCanceler?.release()
                    echoCanceler = null
                    
                    noiseSuppressor?.release()
                    noiseSuppressor = null
                    
                    // Release audio recorder
                    audioRecorder?.release()
                    audioRecorder = null
                }
                
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "Error starting recording: ${e.message}")
                sendEvent(EVENT_ERROR, mapOf("message" to "Error starting recording: ${e.message}"))
                promise.reject("ERR_RECORDING_START", e.message, e)
            }
        }
        
        AsyncFunction("stopRecording") { promise: Promise ->
            if (!isRecording) {
                promise.resolve(null)
                return@AsyncFunction
            }
            
            isRecording = false
            recordingJob?.cancel()
            recordingJob = null
            
            promise.resolve(null)
        }
        
        AsyncFunction("mute") { promise: Promise ->
            isMuted = true
            promise.resolve(null)
        }
        
        AsyncFunction("unmute") { promise: Promise ->
            isMuted = false
            promise.resolve(null)
        }
        
        AsyncFunction("enqueueAudio") { base64EncodedAudio: String, promise: Promise ->
            try {
                val wavData = Base64.decode(base64EncodedAudio, Base64.DEFAULT)
                audioQueue.add(wavData)
                
                if (!isPlaying) {
                    startPlayback()
                }
                
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "Error enqueuing audio: ${e.message}")
                sendEvent(EVENT_ERROR, mapOf("message" to "Error enqueuing audio: ${e.message}"))
                promise.reject("ERR_AUDIO_ENQUEUE", e.message, e)
            }
        }
        
        AsyncFunction("stopPlayback") { promise: Promise ->
            playbackJob?.cancel()
            playbackJob = null
            isPlaying = false
            
            try {
                audioTrack?.pause()
                audioTrack?.flush()
                audioTrack?.stop()
                audioTrack?.release()
                audioTrack = null
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping playback: ${e.message}")
            }
            
            audioQueue.clear()
            promise.resolve(null)
        }
        
        // Register a callback for module cleanup
        OnDestroy {
            job.cancel()
            
            isRecording = false
            recordingJob?.cancel()
            recordingJob = null
            
            playbackJob?.cancel()
            playbackJob = null
            isPlaying = false
            
            try {
                audioTrack?.stop()
                audioTrack?.release()
                audioTrack = null
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing AudioTrack: ${e.message}")
            }
            
            audioQueue.clear()
        }
    }
    
    // WAV header parsing class
    private data class WavHeader(
        val audioFormat: Int,      // PCM = 1
        val numChannels: Int,      // Mono = 1, Stereo = 2
        val sampleRate: Int,       // 8000, 44100, etc.
        val bitsPerSample: Int,    // 8, 16, etc.
        val dataSize: Int,         // Size of the audio data
        val dataOffset: Int        // Offset to the audio data
    )
    
    // Refactored to avoid using break in inline lambdas
    private fun parseWavHeader(data: ByteArray): WavHeader? {
        try {
            if (data.size < 44) { // Minimum WAV header size
                Log.e(TAG, "Data too small to be a valid WAV file")
                return null
            }
            
            // Check RIFF header
            if (String(data, 0, 4) != "RIFF") {
                Log.e(TAG, "Invalid WAV file: missing RIFF header")
                return null
            }
            
            // Check WAVE format
            if (String(data, 8, 4) != "WAVE") {
                Log.e(TAG, "Invalid WAV file: missing WAVE format")
                return null
            }
            
            // Find the "fmt " chunk
            var offset = 12
            
            // Using nullable variable to store result
            var wavHeaderResult: WavHeader? = null
            
            while (offset < data.size - 8 && wavHeaderResult == null) {
                val chunkId = String(data, offset, 4)
                val chunkSize = ByteBuffer.wrap(data, offset + 4, 4).order(ByteOrder.LITTLE_ENDIAN).int
                
                if (chunkId == "fmt ") {
                    // Parse fmt chunk
                    val buffer = ByteBuffer.wrap(data, offset + 8, chunkSize).order(ByteOrder.LITTLE_ENDIAN)
                    val audioFormat = buffer.short.toInt() // PCM = 1
                    val numChannels = buffer.short.toInt() // Mono = 1, Stereo = 2
                    val sampleRate = buffer.int
                    buffer.position(buffer.position() + 6) // Skip byterate and blockalign
                    val bitsPerSample = buffer.short.toInt()
                    
                    // Find the "data" chunk - refactored to avoid break in lambda
                    val dataChunkResult = findDataChunk(data, offset + 8 + chunkSize)
                    
                    if (dataChunkResult != null) {
                        val (dataOffset, dataSize) = dataChunkResult
                        wavHeaderResult = WavHeader(audioFormat, numChannels, sampleRate, bitsPerSample, dataSize, dataOffset)
                    }
                }
                
                offset += 8 + chunkSize
            }
            
            if (wavHeaderResult == null) {
                Log.e(TAG, "Invalid WAV file: no data chunk found")
            }
            
            return wavHeaderResult
            
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing WAV header: ${e.message}")
            return null
        }
    }
    
    // Helper function to find data chunk - extracted to avoid break in lambda
    private fun findDataChunk(data: ByteArray, startPos: Int): Pair<Int, Int>? {
        var pos = startPos
        
        while (pos < data.size - 8) {
            val dataChunkId = String(data, pos, 4)
            val dataChunkSize = ByteBuffer.wrap(data, pos + 4, 4).order(ByteOrder.LITTLE_ENDIAN).int
            
            if (dataChunkId == "data") {
                val dataOffset = pos + 8
                return Pair(dataOffset, dataChunkSize)
            }
            
            pos += 8 + dataChunkSize
        }
        
        return null
    }
    
    private fun startPlayback() {
        if (isPlaying) return
        
        playbackJob = launch {
            isPlaying = true
            
            try {
                playbackLoop@ while (isActive && (isPlaying || audioQueue.isNotEmpty())) {
                    val wavData = audioQueue.poll()
                    
                    // Refactored to avoid using continue in lambda
                    if (wavData == null) {
                        delay(50)
                        if (audioQueue.isEmpty() && !isPlaying) {
                            break@playbackLoop
                        }
                    } else {
                        // Process the audio data
                        processAudioData(wavData)
                    }
                }
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) {
                    Log.i(TAG, "Playback coroutine was cancelled normally")
                } else {
                    Log.e(TAG, "Error during playback: ${e.message}")
                    sendEvent(EVENT_ERROR, mapOf("message" to "Error during playback: ${e.message}"))
                }
            } finally {
                cleanupAudioTrack()
                isPlaying = false
            }
        }
    }
    
    // Helper function to process audio data - extracted to avoid continue in lambda
    private suspend fun processAudioData(wavData: ByteArray) {
        // Parse WAV header
        val wavHeader = parseWavHeader(wavData)
        if (wavHeader == null) {
            // If we can't parse as WAV, try to play as raw PCM
            Log.w(TAG, "Couldn't parse as WAV, trying as raw PCM")
            playRawPcmData(wavData)
            return
        }
        
        // Extract actual audio data
        val audioData = wavData.copyOfRange(wavHeader.dataOffset, wavHeader.dataOffset + wavHeader.dataSize)
        
        // Configure AudioTrack based on WAV properties
        val channelConfig = if (wavHeader.numChannels == 1) 
            AudioFormat.CHANNEL_OUT_MONO else AudioFormat.CHANNEL_OUT_STEREO
            
        val encoding = when (wavHeader.bitsPerSample) {
            8 -> AudioFormat.ENCODING_PCM_8BIT
            16 -> AudioFormat.ENCODING_PCM_16BIT
            else -> {
                Log.e(TAG, "Unsupported bit depth: ${wavHeader.bitsPerSample}")
                sendEvent(EVENT_ERROR, mapOf("message" to "Unsupported bit depth: ${wavHeader.bitsPerSample}"))
                return
            }
        }
        
        // Release any existing AudioTrack
        audioTrack?.apply {
            stop()
            release()
        }
        
        // Create new AudioTrack with the correct parameters
        val minBufferSize = AudioTrack.getMinBufferSize(
            wavHeader.sampleRate,
            channelConfig,
            encoding
        )
        
        // Log.i(TAG, "Creating AudioTrack with: rate: ${wavHeader.sampleRate}, channels: ${wavHeader.numChannels}, bits: ${wavHeader.bitsPerSample}")
        
        audioTrack = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setSampleRate(wavHeader.sampleRate)
                    .setEncoding(encoding)
                    .setChannelMask(channelConfig)
                    .build()
            )
            .setBufferSizeInBytes(maxOf(minBufferSize * 2, audioData.size))
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
        
        audioTrack?.play()
        
        // Play the audio data
        val written = audioTrack?.write(audioData, 0, audioData.size, AudioTrack.WRITE_BLOCKING) ?: 0
        
        if (written < 0) {
            Log.e(TAG, "Error writing audio data: $written")
            sendEvent(EVENT_ERROR, mapOf("message" to "Error writing audio data: $written"))
        } else {
            // Log.i(TAG, "Successfully wrote $written bytes of audio data")
            
            // Wait for playback to complete
            val durationMs = (audioData.size * 1000L) / 
                          (wavHeader.sampleRate * wavHeader.numChannels * (wavHeader.bitsPerSample / 8))
            delay(durationMs)
        }
    }
    
    // Helper function to clean up AudioTrack - extracted for better readability
    private fun cleanupAudioTrack() {
        try {
            audioTrack?.pause()
            audioTrack?.flush()
            audioTrack?.stop()
            audioTrack?.release()
            audioTrack = null
        } catch (e: Exception) {
            Log.e(TAG, "Error cleaning up AudioTrack: ${e.message}")
        }
    }
    
    // Fallback method if data isn't a valid WAV
    private suspend fun playRawPcmData(data: ByteArray) {
        try {
            // Create a new AudioTrack for raw PCM data
            // Assume 16-bit stereo at 44.1kHz
            val minBufferSize = AudioTrack.getMinBufferSize(
                SAMPLE_RATE,
                AudioFormat.CHANNEL_OUT_STEREO, 
                AudioFormat.ENCODING_PCM_16BIT
            )
            
            audioTrack?.apply {
                stop()
                release()
            }
            
            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setSampleRate(SAMPLE_RATE)
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
                        .build()
                )
                .setBufferSizeInBytes(maxOf(minBufferSize * 2, data.size))
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
            
            audioTrack?.play()
            
            // Write and play the audio data
            val written = audioTrack?.write(data, 0, data.size, AudioTrack.WRITE_BLOCKING) ?: 0
            
            if (written < 0) {
                Log.e(TAG, "Error writing raw PCM data: $written")
                sendEvent(EVENT_ERROR, mapOf("message" to "Error writing raw PCM data: $written"))
            } else {
                // Log.i(TAG, "Successfully wrote $written bytes of raw PCM data")
                
                // Estimate duration based on sample rate and size
                val durationMs = (data.size * 1000L) / (SAMPLE_RATE * 2 * 2) // stereo, 16-bit
                delay(durationMs)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error playing raw PCM data: ${e.message}")
            sendEvent(EVENT_ERROR, mapOf("message" to "Error playing raw PCM data: ${e.message}"))
        }
    }
}

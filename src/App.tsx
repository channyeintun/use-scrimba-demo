import React, { useRef, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { useScrimba, type Recording } from 'use-scrimba';

const BasicExample: React.FC = () => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrimbaHook = useScrimba({
    editorRef,
    audioRef, // Enable native audio synchronization
    onRecordingStart: async () => {
      console.log('📹 Recording started with perfect audio sync');
      // Start audio recording when editor recording starts
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        // Reset audio chunks
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        setIsRecordingAudio(true);
        
      } catch (error) {
        console.error('Failed to start audio recording:', error);
      }
    },
    onRecordingStop: (recording: Recording) => console.log('⏹️ Recording stopped', recording),
    onPlaybackStart: () => console.log('▶️ Perfect synchronized playback started'),
    onPlaybackPause: () => console.log('⏸️ Synchronized playback paused'),
    onError: (error: Error) => console.error('🚨 Scrimba error:', error),
    pauseOnUserInteraction: true,
  });

  const {
    isRecording,
    isPlaying,
    currentTime,
    recordings,
    currentRecording,
    recordingStartTime,
    hasEnded,
    startRecording,
    stopRecording,
    play,
    pause,
    seekTo,
    loadRecording,
    deleteRecording,
    handleEditorMount,
    handleEditorChange,
  } = scrimbaHook;

  // Continuous timer for recording
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording && recordingStartTime) {
      interval = setInterval(() => {
        setRecordingTime(Date.now() - recordingStartTime);
      }, 100); // Update every 100ms for smooth timer
    } else {
      setRecordingTime(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, recordingStartTime]);

  const formatTime = (time: number) => {
    const seconds = Math.floor(time / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentRecording) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const targetTime = percentage * currentRecording.duration;
    seekTo(targetTime);
  };

  // Custom stop recording with audio
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.onstop = () => {
        // Create audio blob and attach to recording
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stopRecording({ audioBlob });
      };
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    } else {
      stopRecording();
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      // With the fixed hasEnded API, just call play()
      // It will automatically restart from beginning if ended
      play();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
      <h1 className="text-2xl font-bold mb-6">Code Recorder</h1>

      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <Editor
          height="400px"
          language="javascript"
          theme="vs-dark"
          onMount={(editor) => {
            editorRef.current = editor;
            handleEditorMount(editor);
          }}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            automaticLayout: true,
            // Disable code suggestions and IntelliSense
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off',
            tabCompletion: 'off',
            wordBasedSuggestions: 'off',
            parameterHints: { enabled: false },
            hover: { enabled: false },
            contextmenu: false,
          }}
        />

        <div className="bg-gray-800 px-4 py-3 border-t border-gray-600">
          <div className="flex items-center gap-3">
            {/* Record Button */}
            <button
              onClick={isRecording ? handleStopRecording : startRecording}
              disabled={isPlaying}
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isPlaying 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : isRecording 
                  ? 'bg-red-500' 
                  : 'bg-red-500 hover:bg-red-600'
              } transition-colors`}
            >
              {isRecording ? (
                <div className="w-3 h-3 bg-white rounded-sm" />
              ) : (
                <div className="w-3 h-3 bg-white rounded-full" />
              )}
            </button>

            {/* Play/Pause Button - only show when not recording and has recording */}
            {!isRecording && currentRecording && (
              <button
                onClick={handlePlayPause}
                className="w-6 h-6 rounded flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition-colors"
              >
                {isPlaying ? (
                  <div className="flex gap-0.5">
                    <div className="w-1 h-3 bg-white rounded-sm" />
                    <div className="w-1 h-3 bg-white rounded-sm" />
                  </div>
                ) : hasEnded ? (
                  <svg className="w-3 h-3" fill="white" viewBox="0 0 24 24">
                    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                  </svg>
                ) : (
                  <svg className="w-3 h-3 ml-0.5" fill="white" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            )}

            {/* Progress Bar */}
            <div className="flex-1 flex items-center gap-3">
              {currentRecording && (
                <div 
                  onClick={handleSeek}
                  className="flex-1 h-1 bg-gray-600 cursor-pointer rounded relative overflow-hidden"
                >
                  <div 
                    className="h-full bg-blue-500"
                    style={{
                      width: `${Math.min((currentTime / currentRecording.duration) * 100, 100)}%`
                    }}
                  />
                  <div 
                    className="absolute top-1/2 w-3 h-3 bg-blue-500 rounded-full transform -translate-y-1/2 -translate-x-1/2 border border-white"
                    style={{
                      left: `${Math.min((currentTime / currentRecording.duration) * 100, 100)}%`
                    }}
                  />
                </div>
              )}

              {/* Timer */}
              {isRecording ? (
                <span className="text-red-500 text-sm font-mono">
                  {formatTime(recordingTime)}
                </span>
              ) : currentRecording && (isPlaying || currentTime > 0) && (
                <span className="text-blue-400 text-sm font-mono">
                  {formatTime(currentTime)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recording List - minimal */}
      {recordings.length > 0 && (
        <div className="mt-4">
          <select
            value={currentRecording?.id || ''}
            onChange={(e) => {
              const recording = recordings.find(r => r.id === e.target.value);
              if (recording) loadRecording(recording);
            }}
            className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 text-sm"
          >
            <option value="">Select recording...</option>
            {recordings.map((recording) => (
              <option key={recording.id} value={recording.id}>
                {recording.name} ({formatTime(recording.duration)})
              </option>
            ))}
          </select>
          {currentRecording && (
            <button 
              onClick={() => deleteRecording(currentRecording.id)}
              className="ml-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}

      {/* Hidden Audio Element - Managed by useScrimba hook for perfect sync */}
      <audio ref={audioRef} style={{ display: 'none' }} />

    </div>
  );
};

export default BasicExample;
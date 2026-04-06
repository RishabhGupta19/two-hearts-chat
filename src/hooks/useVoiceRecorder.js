
import { useState, useRef } from 'react';

export const useVoiceRecorder = () => {
    const [recording, setRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [duration, setDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        });

        const recorderOptions =
            typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')
                ? { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 32000 }
                : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.('audio/ogg;codecs=opus')
                ? { mimeType: 'audio/ogg;codecs=opus', audioBitsPerSecond: 32000 }
                : {};
        const mediaRecorder = new MediaRecorder(stream, recorderOptions);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        mediaRecorder.onstop = () => {
            const blobType = recorderOptions.mimeType || chunksRef.current?.[0]?.type || 'audio/webm';
            const blob = new Blob(chunksRef.current, { type: blobType });
            setAudioBlob(blob);
            stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.start(250);
        setRecording(true);
        setDuration(0);
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setRecording(false);
        clearInterval(timerRef.current);
    };

    const cancelRecording = () => {
        mediaRecorderRef.current?.stop();
        setRecording(false);
        setAudioBlob(null);
        setDuration(0);
        clearInterval(timerRef.current);
    };

    return { recording, audioBlob, duration, startRecording, stopRecording, cancelRecording, setAudioBlob };
};

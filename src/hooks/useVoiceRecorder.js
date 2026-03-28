
import { useState, useRef } from 'react';

export const useVoiceRecorder = () => {
    const [recording, setRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [duration, setDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            setAudioBlob(blob);
            stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.start();
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

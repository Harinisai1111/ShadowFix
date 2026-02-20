import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { Camera, Video, Zap, StopCircle, RefreshCw, ShieldAlert, CheckCircle, AlertTriangle, Play, Lock } from 'lucide-react';

const WebcamAnalyzer = () => {
    const { isSignedIn, getToken } = useAuth();
    const { openSignIn } = useClerk();
    const [stream, setStream] = useState(null);
    const [active, setActive] = useState(false);
    const [liveAnalysis, setLiveAnalysis] = useState(false);
    const [recording, setRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [liveStatus, setLiveStatus] = useState(null);

    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const liveIntervalRef = useRef(null);

    // Stop all streams and intervals on cleanup
    const stopEverything = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (liveIntervalRef.current) {
            clearInterval(liveIntervalRef.current);
            liveIntervalRef.current = null;
        }
        setActive(false);
        setLiveAnalysis(false);
        setRecording(false);
        setResult(null);
        setError(null);
        setLiveStatus(null);
    }, [stream]);

    useEffect(() => {
        return () => {
            if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
        };
    }, []);

    // Sync stream to video element
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Video play failed", e));
        }
    }, [stream]);

    const startCamera = async () => {
        if (!isSignedIn) {
            openSignIn();
            return;
        }
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true
            });
            setStream(mediaStream);
            setActive(true);
        } catch (err) {
            console.error("Camera error:", err);
            setError("CAMERA_ERROR: Ensure camera permissions are enabled and no other app is using it.");
        }
    };

    // --- PHOTO CAPTURE ---
    const capturePhoto = async () => {
        if (!isSignedIn) {
            openSignIn();
            return;
        }
        if (!videoRef.current) return;
        setLoading(true);
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

        canvas.toBlob(async (blob) => {
            if (blob) {
                await runAnalysis(blob, 'image');
            } else {
                setError("CAPTURE_FAILED");
                setLoading(false);
            }
        }, 'image/jpeg');
    };

    // --- VIDEO RECORDING ---
    const startRecording = () => {
        if (!isSignedIn) {
            openSignIn();
            return;
        }
        if (!stream) return;
        chunksRef.current = [];
        try {
            const options = { mimeType: 'video/webm;codecs=vp8' };
            mediaRecorderRef.current = new MediaRecorder(stream, options);
            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                await runAnalysis(blob, 'video');
            };
            mediaRecorderRef.current.start();
            setRecording(true);
        } catch (err) {
            setError("RECORDING_START_FAILED");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
        }
    };

    // --- LIVE ANALYSIS TOGGLE ---
    const toggleLiveAnalysis = () => {
        if (!isSignedIn) {
            openSignIn();
            return;
        }
        if (liveAnalysis) {
            if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
            liveIntervalRef.current = null;
            setLiveAnalysis(false);
            setLiveStatus(null);
        } else {
            setLiveAnalysis(true);
            liveIntervalRef.current = setInterval(async () => {
                if (!videoRef.current || loading) return;

                const canvas = document.createElement('canvas');
                canvas.width = 400;
                canvas.height = 300;
                canvas.getContext('2d').drawImage(videoRef.current, 0, 0, 400, 300);

                canvas.toBlob(async (blob) => {
                    if (!blob) return;
                    try {
                        const token = await getToken();
                        const formData = new FormData();
                        formData.append('file', blob, 'live_frame.jpg');
                        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                        const response = await fetch(`${apiUrl}/analyze-image`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: formData,
                        });
                        const data = await response.json();
                        setLiveStatus(data);
                    } catch (e) {
                        console.error("Live Analysis failed", e);
                    }
                }, 'image/jpeg', 0.5);
            }, 3000);
        }
    };

    const runAnalysis = async (blob, type) => {
        if (!blob) return;
        if (!isSignedIn) {
            openSignIn();
            return;
        }
        setLoading(true);
        const formData = new FormData();
        formData.append('file', blob, type === 'image' ? 'capture.jpg' : 'record.webm');

        try {
            const token = await getToken();
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const endpoint = type === 'image' ? '/analyze-image' : '/analyze-video';
            const response = await fetch(`${apiUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Analysis failed");
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err.message || "SERVER_CONNECTION_FAILED");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto glass p-8 border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />

            <div className="text-center mb-8 relative z-10">
                <h2 className="text-3xl font-black glitch-text tracking-tighter uppercase mb-2">Live Detection Hub</h2>
                <p className="text-xs text-cyber-cyan/50 font-mono">AUTHORIZED_SESSION_ACTIVE // SECURE_LINK_V5</p>
            </div>

            {/* Initial Play Button */}
            {!active && (
                <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-cyber-cyan/30 hover:bg-white/5 transition-all group" onClick={startCamera}>
                    <Play className="w-16 h-16 text-cyber-cyan mb-4 group-hover:scale-110 transition-transform" />
                    <span className="text-lg font-mono tracking-widest uppercase">Launch_Camera_Interface</span>
                    <span className="text-[10px] text-white/30 mt-2">REQUIRES_MEDIA_PERMISSIONS</span>
                </div>
            )}

            {/* Unified Camera Interface */}
            {active && (
                <div className="relative z-10">
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />

                        {/* Status Overlays */}
                        <div className="absolute top-4 left-4 font-mono text-[10px] text-cyber-cyan/80 bg-black/50 p-2 backdrop-blur-md">
                            REC: {recording ? 'ACTIVE' : 'IDLE'} | LIVE: {liveAnalysis ? 'ON' : 'OFF'}
                        </div>

                        {/* Live Status Indicator (Compact) */}
                        {liveAnalysis && (
                            <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                                <div className="p-2 backdrop-blur-md bg-black/40 border border-white/10 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse" />
                                    <span className="font-mono text-[10px] text-white/70 uppercase tracking-widest">Live_Feed_Active</span>
                                </div>
                                {!liveStatus && (
                                    <div className="p-2 backdrop-blur-md bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center gap-2">
                                        <RefreshCw size={10} className="text-cyber-cyan animate-spin" />
                                        <span className="font-mono text-[8px] text-cyber-cyan uppercase">Scanning_Pattern...</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Large Real-Time Verdict Overlay */}
                        <AnimatePresence>
                            {liveAnalysis && liveStatus && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className={`absolute bottom-6 left-6 right-6 p-4 backdrop-blur-xl border-l-4 shadow-2xl flex items-center justify-between ${liveStatus.verdict === 'FAKE'
                                        ? 'bg-cyber-alert/20 border-cyber-alert text-cyber-alert shadow-cyber-alert/20'
                                        : 'bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan shadow-cyber-cyan/20'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        {liveStatus.verdict === 'FAKE' ? <ShieldAlert size={32} /> : <CheckCircle size={32} />}
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-mono tracking-[0.2em] opacity-70">Current_Verdict</span>
                                            <span className="text-3xl font-black tracking-tighter uppercase leading-none">{liveStatus.verdict}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] uppercase font-mono tracking-widest opacity-70 mb-1">Authenticity</div>
                                        <div className="text-2xl font-black">{(liveStatus.probability * 100).toFixed(0)}%</div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="absolute inset-0 scanlines opacity-20 pointer-events-none" />
                    </div>

                    {/* Unified Controls Area */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                        <button
                            onClick={capturePhoto}
                            disabled={loading || recording}
                            className="flex items-center justify-center gap-2 px-4 py-4 bg-white/5 border border-white/10 hover:border-cyber-cyan/50 hover:bg-cyber-cyan/10 transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed group"
                        >
                            {isSignedIn ? <Camera size={18} className="text-cyber-cyan" /> : <Lock size={14} className="text-white/30" />} Take_Photo
                        </button>

                        {recording ? (
                            <button
                                onClick={stopRecording}
                                className="flex items-center justify-center gap-2 px-4 py-4 bg-cyber-alert/20 border border-cyber-alert/50 text-cyber-alert animate-pulse text-xs font-bold uppercase tracking-widest transition-all"
                            >
                                <StopCircle size={18} /> Stop_Record
                            </button>
                        ) : (
                            <button
                                onClick={startRecording}
                                disabled={loading}
                                className="flex items-center justify-center gap-2 px-4 py-4 bg-white/5 border border-white/10 hover:border-cyber-purple/50 hover:bg-cyber-purple/10 transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-30"
                            >
                                {isSignedIn ? <Video size={18} className="text-cyber-purple" /> : <Lock size={14} className="text-white/30" />} Start_Record
                            </button>
                        )}

                        <button
                            onClick={toggleLiveAnalysis}
                            className={`flex items-center justify-center gap-2 px-4 py-4 border transition-all text-xs font-bold uppercase tracking-widest ${liveAnalysis ? 'bg-cyber-alert/10 border-cyber-alert text-cyber-alert shadow-[0_0_15px_rgba(255,0,60,0.3)]' : 'bg-white/5 border-white/10 hover:border-cyber-alert/40 text-white/70'}`}
                        >
                            {isSignedIn ? (
                                <Zap size={18} className={liveAnalysis ? 'animate-pulse' : ''} />
                            ) : (
                                <Lock size={14} className="text-white/30" />
                            )} {liveAnalysis ? 'Stop_Live' : 'Live_Detect'}
                        </button>

                        <button
                            onClick={stopEverything}
                            className="flex items-center justify-center gap-2 px-4 py-4 bg-white/5 border border-white/10 hover:bg-white/20 transition-all text-xs font-bold uppercase tracking-widest"
                        >
                            <RefreshCw size={18} /> Close_Hub
                        </button>
                    </div>
                </div>
            )}

            {/* Results Overlay */}
            <AnimatePresence>
                {(loading || result) && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-cyber-dark/95 flex flex-col items-center justify-center p-8 backdrop-blur-xl"
                    >
                        {loading ? (
                            <div className="flex flex-col items-center">
                                <Zap className="w-16 h-16 text-cyber-cyan animate-spin mb-6" />
                                <span className="text-cyber-cyan font-mono tracking-widest glitch-text uppercase">Processing_Media...</span>
                            </div>
                        ) : (
                            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex flex-col items-center text-center">
                                {result.verdict === 'FAKE' ? <ShieldAlert className="w-20 h-20 text-cyber-alert mb-4" /> : <CheckCircle className="w-20 h-20 text-cyber-cyan mb-4" />}
                                <h3 className={`text-6xl font-black mb-2 tracking-tighter ${result.verdict === 'FAKE' ? 'text-cyber-alert' : 'text-cyber-cyan'}`}>{result.verdict}</h3>
                                <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-sm font-mono">
                                    <div className="bg-white/5 p-4 border border-white/10">
                                        <div className="text-[8px] text-white/30 uppercase">Probability</div>
                                        <div className="text-xl font-bold">{(result.probability * 100).toFixed(1)}%</div>
                                    </div>
                                    <div className="bg-white/5 p-4 border border-white/10">
                                        <div className="text-[8px] text-white/30 uppercase">Confidence</div>
                                        <div className="text-xl font-bold uppercase tracking-widest">{result.risk_level}</div>
                                    </div>
                                </div>
                                <button onClick={() => setResult(null)} className="mt-12 px-10 py-3 border border-white/10 hover:border-cyber-cyan/50 font-bold uppercase tracking-widest text-xs">Return_to_Session</button>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {error && (
                <div className="mt-4 p-4 border border-cyber-alert bg-cyber-alert/5 text-cyber-alert font-mono text-[10px] uppercase flex items-center gap-3">
                    <AlertTriangle size={14} /> {error}
                </div>
            )}
        </div>
    );
};

export default WebcamAnalyzer;

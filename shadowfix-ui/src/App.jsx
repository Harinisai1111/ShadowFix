import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    Upload,
    AlertTriangle,
    CheckCircle,
    Zap,
    Lock,
    RefreshCcw,
    FileVideo,
    FileImage,
    Key
} from 'lucide-react';
import { useAuth, useClerk } from '@clerk/clerk-react';

import Navbar from './components/Navbar';
import WebcamAnalyzer from './components/WebcamAnalyzer';
import CyberIdentity from './components/CyberIdentity';
import Hero from './components/Hero';
import DetectionDemo from './components/DetectionDemo';
import Features from './components/Features';

// Home Page Component
const Home = () => (
    <div className="flex flex-col gap-20 py-10">
        <Hero />
        <div className="max-w-7xl mx-auto px-6 w-full">
            <DetectionDemo />
        </div>
        <Features />
    </div>
);

// Surveillance Page Component
const Surveillance = () => (
    <div className="min-h-screen flex items-center justify-center py-20 px-4">
        <WebcamAnalyzer />
    </div>
);

// Manual Analyzer Page Component
const Analyzer = () => {
    const { isSignedIn, getToken } = useAuth();
    const { openSignIn } = useClerk();
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('image');

    const handleFileChange = (e) => {
        if (!isSignedIn) {
            openSignIn();
            return;
        }
        const selectedFile = e.target.files[0];
        if (selectedFile) processFile(selectedFile);
    };

    const processFile = (selectedFile) => {
        if (mode === 'image' && !selectedFile.type.startsWith('image/')) {
            setError("Please upload an image file.");
            return;
        }
        if (mode === 'video' && !selectedFile.type.startsWith('video/')) {
            setError("Please upload a video file.");
            return;
        }

        setFile(selectedFile);
        setError(null);
        setResult(null);

        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(selectedFile);
    };

    const handleUpload = async () => {
        if (!isSignedIn) {
            openSignIn();
            return;
        }
        if (!file) return;

        setLoading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = await getToken();
            const endpoint = mode === 'image' ? '/analyze-image' : '/analyze-video';
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
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
            setResult({
                verdict: data.verdict,
                probability: data.probability,
                risk_level: data.risk_level,
                flag: data.verdict === 'FAKE'
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center py-24 px-4">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-4xl"
            >
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-black mb-4 glitch-text uppercase tracking-widest">Media Analyzer</h2>
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => { setMode('image'); setResult(null); setFile(null); }}
                            className={`flex items-center gap-2 px-6 py-2 transition-all border ${mode === 'image' ? 'bg-cyber-cyan text-cyber-dark border-cyber-cyan shadow-[0_0_20px_#00f3ff]' : 'border-white/10 hover:border-cyber-cyan/50 text-white/50'}`}
                        >
                            <FileImage size={18} /> IMAGE
                        </button>
                        <button
                            onClick={() => { setMode('video'); setResult(null); setFile(null); }}
                            className={`flex items-center gap-2 px-6 py-2 transition-all border ${mode === 'video' ? 'bg-cyber-purple text-white border-cyber-purple shadow-[0_0_20px_#bc13fe]' : 'border-white/10 hover:border-cyber-purple/50 text-white/50'}`}
                        >
                            <FileVideo size={18} /> VIDEO
                        </button>
                    </div>
                </div>

                <div className="glass p-8 rounded-xl border-white/10 relative overflow-hidden group">
                    {!file && (
                        <label
                            onClick={(e) => {
                                if (!isSignedIn) {
                                    e.preventDefault();
                                    openSignIn();
                                }
                            }}
                            className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-cyber-cyan/30 hover:bg-white/5 transition-all"
                        >
                            <Upload className="w-12 h-12 text-cyber-cyan mb-4 animate-bounce" />
                            <span className="text-lg font-mono tracking-widest uppercase">{isSignedIn ? 'DROP_FILE_OR_CLICK' : <span className="flex items-center gap-2">RESTRICTED_ACCESS <Lock size={14} /></span>}</span>
                            <span className="text-xs text-white/30 mt-2 uppercase">{isSignedIn ? `Max ${mode === 'image' ? '5MB' : '25MB'} . ${mode === 'image' ? 'JPG/PNG/WEBP' : 'MP4'}` : 'LOGIN_TO_START_ANALYSIS'}</span>
                            <input type="file" className="hidden" onChange={handleFileChange} />
                        </label>
                    )}

                    {file && !loading && !result && (
                        <div className="flex flex-col items-center gap-8">
                            <div className="relative w-full h-80 rounded-lg overflow-hidden border border-white/10">
                                {mode === 'image' ? (
                                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                                ) : (
                                    <video src={preview} className="w-full h-full object-contain" controls />
                                )}
                                <div className="absolute inset-0 bg-grid opacity-20" />
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => { setFile(null); setPreview(null); }}
                                    className="px-6 py-3 border border-white/10 hover:bg-white/5 transition-all tracking-widest uppercase font-bold text-xs"
                                >
                                    RESET_SOURCE
                                </button>
                                <button
                                    onClick={handleUpload}
                                    className={`px-8 py-3 bg-cyber-${mode === 'image' ? 'cyan text-cyber-dark' : 'purple text-white'} font-bold tracking-widest uppercase shadow-[0_0_30px_rgba(0,0,0,0.5)]`}
                                >
                                    INITIALIZE_ANALYSIS
                                </button>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center h-80">
                            <RefreshCcw className="w-16 h-16 text-cyber-cyan animate-spin mb-6" />
                            <span className="text-cyber-cyan font-mono tracking-widest glitch-text uppercase">RUNNING_SIGNATURE_MODELS...</span>
                        </div>
                    )}

                    {result && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`flex flex-col items-center gap-8 text-center p-6 border-2 ${result.flag ? 'border-cyber-alert shadow-[0_0_50px_rgba(255,0,60,0.2)]' : 'border-cyber-cyan shadow-[0_0_50px_rgba(0,243,255,0.2)]'}`}
                        >
                            <div className="flex items-center gap-3">
                                {result.flag ? <AlertTriangle className="text-cyber-alert w-12 h-12" /> : <CheckCircle className="text-cyber-cyan w-12 h-12" />}
                                <span className={`text-5xl font-black tracking-tighter ${result.flag ? 'text-cyber-alert' : 'text-cyber-cyan'}`}>
                                    {result.verdict}
                                </span>
                            </div>
                            <button
                                onClick={() => { setFile(null); setResult(null); }}
                                className="mt-4 px-8 py-3 border border-white/10 hover:bg-white/5 transition-all tracking-widest font-mono text-xs uppercase"
                            >
                                NEW_SCAN
                            </button>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

function App() {
    const location = useLocation();

    // Scroll to top on route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    return (
        <div className="relative min-h-screen text-white overflow-x-hidden">
            <Navbar />
            <div className="relative z-10 scanlines opacity-90">
                <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                        <Route path="/" element={<Home />} />
                        <Route path="/surveillance" element={<Surveillance />} />
                        <Route path="/analyzer" element={<Analyzer />} />
                    </Routes>
                </AnimatePresence>

                {/* FOOTER */}
                <footer className="py-20 flex flex-col items-center justify-center border-t border-white/5 bg-cyber-dark">
                    <h3 className="text-8xl font-black tracking-tighter opacity-10 mb-8 font-outline select-none">SHADOWFIX</h3>
                    <div className="flex gap-12 text-xs font-mono tracking-widest uppercase text-white/40">
                        <span className="hover:text-cyber-cyan transition-colors cursor-pointer">Protocol_V2</span>
                        <span className="hover:text-cyber-cyan transition-colors cursor-pointer">Zero_Retention</span>
                        <span className="hover:text-cyber-cyan transition-colors cursor-pointer">Encryption_Active</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default App;

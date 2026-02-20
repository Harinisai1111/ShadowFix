import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Activity, Radar, Database } from 'lucide-react';

const DetectionDemo = () => {
    const [logs, setLogs] = useState([
        "[SYSTEM] Initiating security handshake...",
        "[ENCRYPTION] TLS 1.3 Secure tunnel established.",
        "[ZERO-RETENTION] Memory buffer ready."
    ]);

    useEffect(() => {
        const messages = [
            "[CORE] Analyzing pixel variance...",
            "[SIGLIP] SOTA inference in progress...",
            "[WATCHER] Detecting artificial signatures...",
            "[SYSTEM] Real-time monitoring active.",
            "[SECURITY] Aggregating frame metadata...",
            "[PROTECT] User identity masked."
        ];

        const interval = setInterval(() => {
            setLogs(prev => [...prev.slice(-5), messages[Math.floor(Math.random() * messages.length)]]);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-4 py-20 relative z-10">

            {/* Radar Section */}
            <div className="relative flex items-center justify-center">
                <Radar className="absolute w-full h-full text-cyber-cyan/5 animate-pulse" />
                <div className="relative w-80 h-80 rounded-full border border-cyber-cyan/20 flex items-center justify-center">
                    {/* Radar Sweep */}
                    <motion.div
                        className="absolute inset-0 rounded-full border-t-2 border-cyber-cyan shadow-[0_0_15px_#00f3ff]"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="w-60 h-60 rounded-full border border-cyber-cyan/10 flex items-center justify-center">
                        <Activity className="w-16 h-16 text-cyber-cyan animate-pulse" />
                    </div>

                    {/* Detected Blips */}
                    <motion.div
                        className="absolute top-10 right-10 w-2 h-2 bg-cyber-alert rounded-full shadow-[0_0_10px_#ff003c]"
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <motion.div
                        className="absolute bottom-20 left-12 w-2 h-2 bg-cyber-cyan rounded-full shadow-[0_0_10px_#00f3ff]"
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    />
                </div>
            </div>

            {/* Terminal Section */}
            <div className="glass p-8 rounded-lg font-mono text-left border-cyber-cyan/20 shadow-[0_0_30px_rgba(0,243,255,0.05)]">
                <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4 text-cyber-cyan">
                    <Terminal className="w-5 h-5" />
                    <span className="text-sm font-bold tracking-widest uppercase">Security_Monitor.v2.0</span>
                    <div className="ml-auto flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-cyber-alert/50" />
                        <div className="w-2 h-2 rounded-full bg-cyber-cyan/50" />
                    </div>
                </div>

                <div className="space-y-3 h-64 overflow-hidden">
                    <AnimatePresence mode="popLayout">
                        {logs.map((log, i) => (
                            <motion.div
                                key={`${log}-${i}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="text-xs md:text-sm text-white/70"
                            >
                                <span className="text-cyber-cyan pr-2">{">"}</span> {log}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-white/40">Status</span>
                            <span className="text-xs text-cyber-cyan font-bold uppercase tracking-widest">Live Monitoring</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-white/40">Threats</span>
                            <span className="text-xs text-cyber-alert font-bold uppercase tracking-widest">Active Scan</span>
                        </div>
                    </div>
                    <Database className="w-6 h-6 text-white/20" />
                </div>
            </div>
        </div>
    );
};

export default DetectionDemo;

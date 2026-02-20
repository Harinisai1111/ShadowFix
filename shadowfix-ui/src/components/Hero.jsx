import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const Hero = () => {
    return (
        <div className="relative z-10 flex flex-col items-center pt-32 pb-20 px-4 text-center min-h-screen">

            {/* 1. Title with Refined Glitch */}
            <div className="relative mb-12">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-7xl md:text-9xl font-black tracking-tighter relative z-10"
                >
                    <span className="relative inline-block glitch-text-premium" data-text="SHADOWFIX">
                        SHADOWFIX
                    </span>
                </motion.h1>

                {/* Decorative horizontal flicker lines */}
                <motion.div
                    animate={{
                        opacity: [0, 0.5, 0],
                        x: ['-10%', '110%']
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatDelay: 2
                    }}
                    className="absolute top-1/2 left-0 w-20 h-[1px] bg-cyber-cyan shadow-[0_0_10px_#00f3ff] z-20 pointer-events-none"
                />
            </div>

            {/* 2. Tagline */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1.0 }}
                className="mb-12"
            >
                <p className="text-xs md:text-sm font-mono tracking-[0.4em] uppercase text-white/60">
                    Securing Reality. <span className="text-cyber-cyan">Detecting Deception.</span>
                </p>
            </motion.div>

            {/* 4. CTA Button */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.5 }}
            >
                <Link
                    to="/analyzer"
                    className="group relative inline-flex px-10 py-4 bg-transparent border border-white/10 text-white font-bold text-lg tracking-[0.2em] overflow-hidden transition-all hover:border-cyber-cyan/50 hover:shadow-[0_0_40px_rgba(0,243,255,0.15)]"
                >
                    <span className="relative z-10 flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-cyber-cyan" />
                        VERIFY MEDIA
                    </span>
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 h-[1px] bg-cyber-cyan w-0 group-hover:w-full transition-all duration-500" />
                </Link>
            </motion.div>

            {/* 5. Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-20 hidden md:flex flex-col items-center gap-3">
                <span className="text-[10px] font-mono tracking-widest uppercase">System_Active</span>
                <div className="w-[1px] h-12 bg-gradient-to-b from-cyber-cyan to-transparent" />
            </div>
        </div>
    );
};

export default Hero;

import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Shield, Zap, Cpu } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, desc, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay }}
        whileHover={{ y: -10, rotateX: 5, rotateY: 5 }}
        className="glass p-8 rounded-xl border-white/5 group relative overflow-hidden transition-all hover:border-cyber-cyan/30"
    >
        <div className="absolute inset-0 bg-gradient-to-br from-cyber-cyan/0 via-transparent to-cyber-purple/0 group-hover:from-cyber-cyan/5 group-hover:to-cyber-purple/5 transition-all" />

        <div className="relative z-10">
            <div className="w-12 h-12 rounded bg-cyber-dark border border-white/10 flex items-center justify-center mb-6 group-hover:border-cyber-cyan/50 group-hover:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all">
                <Icon className="w-6 h-6 text-cyber-cyan" />
            </div>
            <h3 className="text-xl font-black mb-3 text-white group-hover:text-cyber-cyan transition-colors tracking-tight uppercase">{title}</h3>
            <p className="text-sm text-white/50 leading-relaxed font-mono">{desc}</p>
        </div>

        {/* Subtle Glitch Flash on Hover */}
        <motion.div
            className="absolute inset-0 bg-white opacity-0 pointer-events-none"
            whileHover={{ opacity: [0, 0.1, 0] }}
            transition={{ duration: 0.2 }}
        />
    </motion.div>
);

const Features = () => {
    const data = [
        {
            icon: Eye,
            title: "Neural Vision",
            desc: "SOTA SigLIP transformers detect pixel-level inconsistencies invisible to the human eye.",
            delay: 0.1
        },
        {
            icon: Shield,
            title: "Zero Retention",
            desc: "Media is processed in-memory and unlinked instantly. Your data never touches the disk.",
            delay: 0.2
        },
        {
            icon: Zap,
            title: "Flash Analysis",
            desc: "Instant analytical verification scores across multiple samples for reliable accuracy.",
            delay: 0.3
        },
        {
            icon: Cpu,
            title: "Edge Shield",
            desc: "Optimized CPU inference paths ensure privacy-first monitoring at the gateway.",
            delay: 0.4
        }
    ];

    return (
        <div className="w-full max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 py-20 relative z-10">
            {data.map((item, i) => (
                <FeatureCard key={i} {...item} />
            ))}
        </div>
    );
};

export default Features;

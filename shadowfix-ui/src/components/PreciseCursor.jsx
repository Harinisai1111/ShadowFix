import React, { useEffect, useState } from 'react';

const PreciseCursor = () => {
    const [pos, setPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMove = (e) => {
            setPos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    return (
        <div
            className="fixed pointer-events-none z-[10000] mix-blend-difference"
            style={{ left: `${pos.x}px`, top: `${pos.y}px`, transform: 'translate(-50%, -50%)' }}
        >
            {/* Central Crosshair */}
            <div className="relative flex items-center justify-center">
                <div className="w-8 h-px bg-cyber-cyan opacity-50" />
                <div className="h-8 w-px bg-cyber-cyan opacity-50 absolute" />
                <div className="w-2 h-2 border border-cyber-cyan rounded-full absolute animate-pulse" />
            </div>

            {/* Coordinate Labels */}
            <div className="absolute top-4 left-4 font-mono text-[8px] tracking-tighter text-cyber-cyan/50 whitespace-nowrap">
                X: {pos.x.toString().padStart(4, '0')}
                <br />
                Y: {pos.y.toString().padStart(4, '0')}
            </div>

            {/* Target Corners */}
            <div className="absolute -top-4 -left-4 w-2 h-2 border-t border-l border-cyber-cyan/30" />
            <div className="absolute -top-4 -right-4 w-2 h-2 border-t border-r border-cyber-cyan/30" />
            <div className="absolute -bottom-4 -left-4 w-2 h-2 border-b border-l border-cyber-cyan/30" />
            <div className="absolute -bottom-4 -right-4 w-2 h-2 border-b border-r border-cyber-cyan/30" />
        </div>
    );
};

export default PreciseCursor;

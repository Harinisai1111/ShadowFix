import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { motion } from 'framer-motion';

// Custom Distortion Shader with periodic glitch support
const DistortionShader = {
    uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        distortionAmount: { value: 0 },
        mousePos: { value: new THREE.Vector2(0, 0) },
        hasTexture: { value: 0 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float distortionAmount;
        uniform vec2 mousePos;
        uniform float hasTexture;
        varying vec2 vUv;

        // Psuedo-random hash for noise
        float hash(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }

        void main() {
            vec2 uv = vUv;
            
            // Mouse-based subtle parallax shift for eyes
            vec2 eyeLink = (mousePos - 0.5) * 0.012;
            
            vec4 texColor;
            if (hasTexture > 0.5) {
                // Periodic Distortion / Glitch Logic
                if (distortionAmount > 0.0) {
                    // ... distortion logic ...
                    float r = texture2D(tDiffuse, uv + vec2(0.008 * distortionAmount, 0.0)).r;
                    float g = texture2D(tDiffuse, uv).g;
                    float b = texture2D(tDiffuse, uv - vec2(0.008 * distortionAmount, 0.0)).b;
                    texColor = vec4(r, g, b, 1.0);
                    
                    // Add bright noise flicker
                    if (hash(vec2(time, 0.0)) > 0.98) {
                        texColor.rgb += 0.2 * distortionAmount;
                    }
                } else {
                    // Normal state with subtle parallax
                    texColor = texture2D(tDiffuse, uv + eyeLink * (1.0 - distance(uv, vec2(0.5))));
                }
                
                // Subtle visibility boost for dark cinematic face
                texColor.rgb *= 1.25; 
            } else {
                // Background fallback (Cyber gradient)
                float d = distance(uv, vec2(0.5));
                texColor = vec4(vec3(0.0, 0.95, 1.0) * smoothstep(0.4, 0.0, d) * 0.1, 1.0);
            }
            
            // Global Scanlines
            float scanline = sin(uv.y * 800.0 + time * 5.0) * 0.02;
            texColor.rgb -= scanline;

            gl_FragColor = texColor;
        }
    `
};

const IdentityFace = ({ mousePos }) => {
    const meshRef = useRef();
    const materialRef = useRef();
    const [texture, setTexture] = useState(null);
    const [hasTexture, setHasTexture] = useState(false);

    // Load asset manually to ensure stability
    useEffect(() => {
        const loader = new THREE.TextureLoader();
        loader.load(
            '/assets/cyber_face.png',
            (tex) => {
                setTexture(tex);
                setHasTexture(true);
            },
            undefined,
            () => setHasTexture(false)
        );
    }, []);

    const [distortion, setDistortion] = useState(0);

    // Equal small intervals for distortion (e.g., every 4 seconds)
    useEffect(() => {
        const triggerGlitch = () => {
            setDistortion(1.0);
            setTimeout(() => setDistortion(0), 150 + Math.random() * 150);
            setTimeout(triggerGlitch, 4000); // Fixed 4s interval for "equal intervals"
        };
        const timeoutId = setTimeout(triggerGlitch, 2000);
        return () => clearTimeout(timeoutId);
    }, []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (materialRef.current) {
            materialRef.current.uniforms.time.value = t;
            materialRef.current.uniforms.distortionAmount.value = THREE.MathUtils.lerp(
                materialRef.current.uniforms.distortionAmount.value,
                distortion,
                0.2
            );
            materialRef.current.uniforms.mousePos.value.lerp(
                new THREE.Vector2(mousePos.x, mousePos.y),
                0.05
            );
            materialRef.current.uniforms.hasTexture.value = hasTexture ? 1.0 : 0.0;
            if (texture) materialRef.current.uniforms.tDiffuse.value = texture;
        }
    });

    const uniforms = useMemo(() => THREE.UniformsUtils.clone(DistortionShader.uniforms), []);

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[16, 16]} />
            <shaderMaterial
                ref={materialRef}
                uniforms={uniforms}
                vertexShader={DistortionShader.vertexShader}
                fragmentShader={DistortionShader.fragmentShader}
                transparent={true}
                depthWrite={false}
            />
        </mesh>
    );
};

const CyberIdentity = () => {
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMouse({
                x: e.clientX / window.innerWidth,
                y: 1 - (e.clientY / window.innerHeight)
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="fixed inset-0 z-0 bg-cyber-dark">
            <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
                <IdentityFace mousePos={mouse} />
            </Canvas>

            {/* Vibe Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-transparent to-[#050608] opacity-50 pointer-events-none" />

            {/* Scanning Line Animation */}
            <motion.div
                animate={{ top: ['-10%', '110%'] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 w-full h-[1px] bg-cyber-cyan/20 blur-[1px] pointer-events-none z-10"
            />

            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
    );
};

export default CyberIdentity;

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float, MeshDistortMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';

const BrainSphere = () => {
    const mesh = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        mesh.current.rotation.x = Math.cos(t / 4) / 8;
        mesh.current.rotation.y = Math.sin(t / 4) / 8;
        mesh.current.rotation.z = Math.sin(t / 4) / 10;
        mesh.current.position.y = Math.sin(t / 1.5) / 10;
    });

    return (
        <Float speed={1.5} rotationIntensity={1} floatIntensity={2}>
            <Sphere ref={mesh} args={[1, 64, 64]}>
                <MeshDistortMaterial
                    color="#00f3ff"
                    attach="material"
                    distort={0.4}
                    speed={2}
                    roughness={0}
                    emissive="#00f3ff"
                    emissiveIntensity={0.5}
                    wireframe
                />
            </Sphere>
        </Float>
    );
};

const Connections = () => {
    const points = useMemo(() => {
        const p = [];
        for (let i = 0; i < 50; i++) {
            p.push(new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10));
        }
        return p;
    }, []);

    return (
        <group>
            {points.map((p, i) => (
                <mesh key={i} position={p}>
                    <sphereGeometry args={[0.02, 8, 8]} />
                    <meshBasicMaterial color="#bc13fe" transparent opacity={0.5} />
                </mesh>
            ))}
        </group>
    );
};

const CyberBackground = () => {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#00f3ff" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#bc13fe" />

                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                <BrainSphere />
                <Connections />
            </Canvas>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050608]/50 to-[#050608]" />
            <div className="absolute inset-0 bg-grid opacity-20" />
        </div>
    );
};

export default CyberBackground;

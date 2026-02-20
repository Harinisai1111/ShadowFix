import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { SignInButton, UserButton, SignedIn, SignedOut } from '@clerk/clerk-react';

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'OVERVIEW', path: '/' },
        { name: 'SURVEILLANCE', path: '/surveillance' },
        { name: 'ANALYZER', path: '/analyzer' },
    ];

    return (
        <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled || location.pathname !== '/' ? 'bg-cyber-dark/80 backdrop-blur-md border-b border-white/5 py-3' : 'bg-transparent py-6'}`}>
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                    <Shield className="w-8 h-8 text-cyber-cyan group-hover:rotate-12 transition-transform" />
                    <span className="text-2xl font-black tracking-tighter glitch-text">SHADOWFIX</span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-10">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            className={`relative text-xs font-bold tracking-[0.2em] transition-colors group ${location.pathname === link.path ? 'text-cyber-cyan' : 'text-white/70 hover:text-cyber-cyan'}`}
                        >
                            {link.name}
                            <span className={`absolute -bottom-1 left-0 h-px bg-cyber-cyan transition-all duration-300 ${location.pathname === link.path ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                            <span className={`absolute -bottom-1 left-0 h-px bg-cyber-cyan blur-[2px] transition-all duration-300 ${location.pathname === link.path ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                        </Link>
                    ))}

                    <SignedOut>
                        <SignInButton mode="modal">
                            <button className="px-5 py-2 border border-cyber-cyan/30 text-cyber-cyan text-[10px] font-bold tracking-widest hover:bg-cyber-cyan hover:text-cyber-dark transition-all">
                                SIGN_IN
                            </button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <UserButton
                            appearance={{
                                elements: {
                                    userButtonAvatarBox: "border border-cyber-cyan/30"
                                }
                            }}
                        />
                    </SignedIn>
                </div>

                {/* Mobile Toggle */}
                <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:hidden absolute top-full left-0 w-full bg-cyber-dark/95 backdrop-blur-xl border-b border-white/10 p-6 flex flex-col gap-6"
                >
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            className={`text-lg font-bold tracking-widest text-center ${location.pathname === link.path ? 'text-cyber-cyan' : 'text-white/70'}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}

                    <div className="flex justify-center pt-4 border-t border-white/10">
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="w-full py-4 border border-cyber-cyan/30 text-cyber-cyan text-sm font-bold tracking-[0.2em] hover:bg-cyber-cyan hover:text-cyber-dark transition-all">
                                    SIGN_IN
                                </button>
                            </SignInButton>
                        </SignedOut>
                        <SignedIn>
                            <div className="flex flex-col items-center gap-4">
                                <UserButton
                                    appearance={{
                                        elements: {
                                            userButtonAvatarBox: "w-12 h-12 border-2 border-cyber-cyan/30"
                                        }
                                    }}
                                />
                                <span className="text-[10px] font-mono text-cyber-cyan/50 tracking-widest">SECURE_SESSION_ACTIVE</span>
                            </div>
                        </SignedIn>
                    </div>
                </motion.div>
            )}
        </nav>
    );
};

export default Navbar;

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                cyber: {
                    dark: "#050608",
                    cyan: "#00f3ff",
                    purple: "#bc13fe",
                    alert: "#ff003c",
                    grid: "rgba(0, 243, 255, 0.05)",
                }
            },
            fontFamily: {
                cyber: ["Inter", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
            animation: {
                'glitch': 'glitch 0.3s cubic-bezier(.25,.46,.45,.94) both infinite',
                'scan': 'scan 8s linear infinite',
            },
            keyframes: {
                glitch: {
                    '0%': { transform: 'translate(0)' },
                    '20%': { transform: 'translate(-2px, 2px)' },
                    '40%': { transform: 'translate(-2px, -2px)' },
                    '60%': { transform: 'translate(2px, 2px)' },
                    '80%': { transform: 'translate(2px, -2px)' },
                    '100%': { transform: 'translate(0)' },
                },
                scan: {
                    '0%': { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(100%)' },
                }
            }
        },
    },
    plugins: [],
}

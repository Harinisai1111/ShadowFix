import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import './index.css'

// IMPORTANT: Please get your actual Clerk Publishable Key from the Clerk Dashboard (https://dashboard.clerk.com)
// and paste it into the VITE_CLERK_PUBLISHABLE_KEY field in your .env file.
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY || CLERK_PUBLISHABLE_KEY === "pk_test_Y2xlcmsuY29tJA") {
    console.warn("CLERK_WARNING: You are using a default/missing Publishable Key. Authentication will not work until you set a valid key in your .env file.");
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </ClerkProvider>
    </React.StrictMode>,
)

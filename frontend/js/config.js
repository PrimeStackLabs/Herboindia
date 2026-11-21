/**
 * Herbo India - Frontend API Configuration
 * 
 * When your backend is deployed on Render (or any cloud host),
 * paste your live Render backend URL into window.VITE_API_URL below:
 * 
 * Example:
 * window.VITE_API_URL = "https://herboindia-backend.onrender.com";
 * 
 * If left empty (""), the client will automatically connect to:
 * - http://localhost:3000 during local development
 * - Same-origin when running with a reverse proxy
 */
window.VITE_API_URL = "";

// Bind API Base for patient enquiries and doctor portal
window.__API_BASE__ = window.VITE_API_URL || window.__API_BASE__ || "";

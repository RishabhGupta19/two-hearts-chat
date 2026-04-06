import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(<App />);

// Listen for service worker controller changes so we can detect updates
// and handle them silently (no Chrome update toast).
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
	navigator.serviceWorker.addEventListener('controllerchange', () => {
		console.log('[SW] controllerchange — updated silently');
	});
}
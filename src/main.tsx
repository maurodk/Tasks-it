import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// import { initFocusRefetch } from "./lib/focusRefetch";

// Initialize global refetch broadcaster - DISABLED to prevent loops
// initFocusRefetch();

createRoot(document.getElementById("root")!).render(<App />);

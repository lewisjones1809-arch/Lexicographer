import { StrictMode, Component } from "react";
import { createRoot } from "react-dom/client";
import Lexicographer from "./lexicographer.jsx";

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "monospace", background: "#1a0a0a", color: "#ff6060", minHeight: "100vh" }}>
          <h2 style={{ color: "#ff8080" }}>Runtime Error</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{this.state.error.toString()}</pre>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "#ff4040", marginTop: 16 }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <Lexicographer />
    </ErrorBoundary>
  </StrictMode>
);

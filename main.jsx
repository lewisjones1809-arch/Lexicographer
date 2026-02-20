import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Lexicographer from "./lexicographer.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Lexicographer />
  </StrictMode>
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Poster from "./Poster.jsx";
import Method from "./Method.jsx";

// the map, or the method page at ?method
const showMethod = new URLSearchParams(window.location.search).has("method");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {showMethod ? <Method /> : <Poster />}
  </StrictMode>,
);

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registra il service worker solo in produzione (in sviluppo intralcerebbe l'HMR).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  // Quando una nuova versione prende il controllo, ricarica una volta sola
  // (così l'app si aggiorna da sé senza svuotare cache a mano).
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker
      // updateViaCache:"none" → il browser controlla sempre sw.js dal server (mai dalla cache).
      .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: "none" })
      .then((reg) => reg.update())
      .catch(() => {
        /* registrazione non riuscita: l'app funziona comunque, senza offline */
      });
  });
}

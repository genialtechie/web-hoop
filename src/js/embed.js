// When hoopzy.fun runs inside the arcade cabinet on genialtechie.site, the
// game has keyboard focus, so the portfolio can't hear Esc. This tells it.
// It also shares the player's best score so the cabinet can show it.
const EMBED_ORIGINS = [
  "https://genialtechie.site",
  "https://www.genialtechie.site",
  "http://localhost:5173",
];

function parentOrigin() {
  if (window.parent === window) return null;
  try {
    const origin = new URL(document.referrer).origin;
    return EMBED_ORIGINS.includes(origin) ? origin : null;
  } catch {
    return null;
  }
}

export function connectEmbed(game) {
  const origin = parentOrigin();
  if (!origin) return;

  const send = (message) => window.parent.postMessage(message, origin);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") send({ type: "hoopzy:exit" });
  });

  window.addEventListener("hoopzy:best", (e) => {
    send({ type: "hoopzy:best", value: e.detail });
  });
  if (game.highScore > 0) send({ type: "hoopzy:best", value: game.highScore });
}

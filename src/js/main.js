import { Game } from "./game/Game.js";

// Initialize the game
document.addEventListener("DOMContentLoaded", () => {
  const game = new Game();
  game.init();
});

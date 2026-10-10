import { Game } from "./game/Game.js";
import { connectEmbed } from "./embed.js";

// Initialize the game
document.addEventListener("DOMContentLoaded", () => {
  const game = new Game();
  connectEmbed(game);
  game.init();
});

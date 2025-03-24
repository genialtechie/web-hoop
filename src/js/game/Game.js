import * as THREE from "three";
import { AmmoPhysics, PhysicsLoader } from "@enable3d/ammo-physics";
import { Basketball } from "./Basketball.js";
import { Hoop } from "./Hoop.js";
import { InputManager } from "./InputManager.js";
import { delay } from "../utils/helpers.js";

export class Game {
  constructor() {
    // Canvas element
    this.canvas = document.getElementById("game-canvas");

    // Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.physics = null;

    // Game objects
    this.basketball = null;
    this.hoop = null;
    this.inputManager = null;

    // Game state
    this.isInitialized = false;
    this.animationFrameId = null;
    this.clock = new THREE.Clock();
    this.score = 0;
    this.scoreElement = document.getElementById("score");
    this.highScore = this.loadHighScore();
    this.streak = 0; // Current streak of successful baskets
    this.gameState = "IDLE"; // IDLE, AIMING, SHOOTING, SCORED, RESET
    this.pendingReset = false; // Flag to track if a reset is already scheduled
    this.shotStartTime = 0; // Track when a shot starts
    this.maxShotTime = 2000; // Maximum time for a shot (2 seconds)
    this.resetDelay = 800; // Shorter reset delay (800ms)

    // Initialize score display
    this.updateScoreDisplay();

    // Bind methods
    this.update = this.update.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.initPhysics = this.initPhysics.bind(this);
    this.handleSwipe = this.handleSwipe.bind(this);
    this.testShot = this.testShot.bind(this);

    // Add keyboard listener for test shot
    window.addEventListener("keydown", (e) => {
      if (e.key === " ") {
        // Space bar
        this.testShot();
      }
    });
  }

  // Load high score from local storage
  loadHighScore() {
    const storedHighScore = localStorage.getItem("basketballHighScore");
    return storedHighScore ? parseInt(storedHighScore) : 0;
  }

  // Save high score to local storage
  saveHighScore() {
    localStorage.setItem("basketballHighScore", this.highScore.toString());
  }

  // Update the score display
  updateScoreDisplay() {
    if (this.scoreElement) {
      this.scoreElement.innerHTML = `
        <div>Score: ${this.score}</div>
        <div>High Score: ${this.highScore}</div>
        ${this.streak > 1 ? `<div>Streak: ${this.streak} 🔥</div>` : ""}
      `;
    }
  }

  init() {
    if (this.isInitialized) return;

    // We'll initialize the scene, camera, and renderer first
    this.initGraphics();

    // Then load the physics
    PhysicsLoader("/lib", this.initPhysics);
  }

  initGraphics() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 2.5, 6); // Reset to standard view position
    this.camera.lookAt(0, 2, -2); // Look slightly up towards the hoop

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    // Add lights
    this.setupLights();

    // Add event listeners
    window.addEventListener("resize", this.handleResize);
  }

  initPhysics() {
    // Initialize Ammo.js physics
    this.physics = new AmmoPhysics(this.scene);

    // Set stronger gravity for more natural bouncing
    this.physics.setGravity(0, -12, 0); // Default is (0, -9.8, 0)

    // Enable debug rendering during development with more visible settings
    // this.physics.debug.enable();

    // Set custom debug colors for better visibility
    if (this.physics.debug && this.physics.debug.debugDrawer) {
      // Make debug lines more visible
      this.physics.debug.debugDrawer.setDefaultColors({
        activeColor: 0xff0000, // Red for active bodies
        activeWireframeColor: 0xff7777, // Light red for active wireframes
        sleepingColor: 0x0000ff, // Blue for sleeping bodies
        sleepingWireframeColor: 0x7777ff, // Light blue for sleeping wireframes
        deactivatedColor: 0x00ff00, // Green for deactivated bodies
        deactivatedWireframeColor: 0x77ff77, // Light green for deactivated wireframes
      });
    }

    // Create ground with physics
    this.createGround();

    // Create basketball and hoop
    this.createGameObjects();

    // Create input manager for swipe controls
    this.setupInputManager();

    // Start game loop after physics is initialized
    this.isInitialized = true;
    this.update();
  }

  setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Directional light (sunlight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;

    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;

    this.scene.add(directionalLight);
  }

  createGround() {
    // Create a floor plane with physics
    const width = 20;
    const height = 20;

    // Add a physical ground plane with improved properties for bounce
    const ground = this.physics.add.ground(
      {
        width,
        height,
        depth: 1,
        restitution: 0.95, // Increased from 0.9 to 0.95 for better bounce
      },
      { phong: { color: 0x2e8b57, transparent: true, opacity: 0.8 } },
    );

    // set bounciness
    ground.body.setBounciness(1);
  }

  createGameObjects() {
    // Create the basketball
    this.basketball = new Basketball(this.physics, this.scene, {
      position: { x: 0, y: 1.5, z: 2 }, // Matching reset position
    });

    // Create the hoop and backboard
    this.hoop = new Hoop(this.physics, this.scene, {
      position: { x: 0, y: 3.05, z: -5 }, // Moved further back
    });
  }

  setupInputManager() {
    // Create input manager for handling swipes
    this.inputManager = new InputManager({
      element: this.canvas,
      camera: this.camera,
      strength: 4, // Reduced for more controlled shots
      showTrajectory: true,
      onSwipe: this.handleSwipe,
    });

    // Add trajectory line to scene if it exists
    const trajectoryLine = this.inputManager.getTrajectoryLine();
    if (trajectoryLine) {
      this.scene.add(trajectoryLine);
    }
  }

  handleSwipe(force, isPreview = false) {
    // Only allow shooting if the ball is not already in motion
    if (this.gameState !== "SHOOTING" && this.basketball) {
      // Calculate distance to hoop for force adjustment
      const ballPos = this.basketball.getPosition();
      const hoopPos = new THREE.Vector3(0, 3.05, -5); // Hoop position
      const distanceToHoop = ballPos.distanceTo(hoopPos);

      // Add more upward arc and adjust force based on distance
      const modifiedForce = new THREE.Vector3(
        force.x * 0.7, // Reduce left/right movement
        force.y * 1.8, // Increased upward force for better arc
        force.z * (distanceToHoop / 5), // Increased forward force
      );

      // Add a slight auto-aim assist towards the hoop
      const aimAssist = new THREE.Vector3(
        -ballPos.x * 0.1, // Slight correction towards center
        0,
        0,
      );
      modifiedForce.add(aimAssist);

      if (isPreview) {
        // Just update the trajectory preview
        if (this.inputManager.trajectoryLine) {
          const ballPosition = this.basketball.getPosition();
          this.inputManager.updateTrajectoryLine(ballPosition, modifiedForce);
        }
        this.gameState = "AIMING";
      } else {
        // Actually shoot the ball
        this.basketball.applyForce(modifiedForce);
        this.gameState = "SHOOTING";

        // Record the shot start time
        this.shotStartTime = Date.now();

        // Hide the trajectory line
        this.inputManager.hideTrajectoryLine();

        console.log("Shot taken with force:", modifiedForce);
      }
    }
  }

  update() {
    this.animationFrameId = requestAnimationFrame(this.update);

    // Update physics if initialized
    if (this.physics) {
      const delta = this.clock.getDelta() * 1000;
      this.physics.update(delta);
      this.physics.updateDebugger();

      // Update game objects
      if (this.basketball) this.basketball.update();
      if (this.hoop) this.hoop.update();

      // Check for basket made
      this.checkForBasket();

      // Check ball state
      this.checkBallState();
    }

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  checkForBasket() {
    // Only check if both the basketball and hoop exist and the ball is in motion
    if (
      this.gameState === "SHOOTING" &&
      this.basketball &&
      this.hoop &&
      this.basketball.mesh &&
      this.hoop.triggerZone &&
      !this.pendingReset
    ) {
      // Get the ball's velocity to ensure it's moving downward through the hoop
      const velocity = this.basketball.getVelocity();

      // Check if ball is passing through the hoop from top to bottom
      if (velocity.y < 0 && this.hoop.checkBasket(this.basketball.mesh)) {
        // Increment score
        this.score++;

        // Increment streak
        this.streak++;

        // Check for high score
        if (this.score > this.highScore) {
          this.highScore = this.score;
          this.saveHighScore();
        }

        // Update the score display
        this.updateScoreDisplay();

        // Update game state
        this.gameState = "SCORED";

        // Schedule a reset after a short delay
        this.pendingReset = true;

        // Play success sound or visual effect
        this.showScoreEffect();

        setTimeout(() => {
          if (this.gameState === "SCORED") {
            this.resetBasketball();
          }
        }, this.resetDelay);
      }
    }
  }

  // Reset the basketball after scoring
  resetBasketball() {
    try {
      console.log("Resetting basketball after score...");
      this.basketball.reset({ x: 0, y: 1.5, z: 2 }); // Closer reset position
      this.gameState = "IDLE";
    } catch (error) {
      console.error("Error during reset after score:", error);
    } finally {
      // Clear the pending reset flag
      this.pendingReset = false;
    }
  }

  // Show a visual effect when scoring
  showScoreEffect() {
    // Create a simple text popup at the score location
    const scorePopup = document.createElement("div");
    scorePopup.textContent = "+1";
    scorePopup.style.position = "absolute";
    scorePopup.style.color = "#ffcc00";
    scorePopup.style.fontSize = "36px";
    scorePopup.style.fontWeight = "bold";
    scorePopup.style.textShadow = "2px 2px 4px rgba(0, 0, 0, 0.7)";
    scorePopup.style.top = "100px";
    scorePopup.style.left = "50%";
    scorePopup.style.transform = "translateX(-50%)";
    scorePopup.style.pointerEvents = "none";
    scorePopup.style.zIndex = "100";
    scorePopup.style.opacity = "1";
    scorePopup.style.transition = "all 1s ease-out";

    document.body.appendChild(scorePopup);

    // Animate the popup
    setTimeout(() => {
      scorePopup.style.opacity = "0";
      scorePopup.style.top = "50px";

      // Remove the element after animation
      setTimeout(() => {
        document.body.removeChild(scorePopup);
      }, 1000);
    }, 50);
  }

  checkBallState() {
    if (
      this.gameState === "SHOOTING" &&
      this.basketball &&
      !this.pendingReset
    ) {
      const position = this.basketball.getPosition();
      const velocity = this.basketball.getVelocity();

      // Check if ball is out of bounds (too far or below ground)
      const isTooFar = Math.abs(position.x) > 10 || Math.abs(position.z) > 10;
      const isBelowGround = position.y < -5;

      // Check if ball has stopped moving (very low velocity)
      const speed = velocity.length();
      const hasStopped = speed < 0.1;

      // Check if maximum shot time has elapsed
      const shotTime = Date.now() - this.shotStartTime;
      const shotTimeExceeded = shotTime > this.maxShotTime;

      if (isTooFar || isBelowGround || hasStopped || shotTimeExceeded) {
        // Set the pending reset flag to prevent multiple reset attempts
        this.pendingReset = true;

        // Update game state
        this.gameState = "RESET";

        // Reset streak when missing a shot
        this.streak = 0;

        // Update the score display to show the reset streak
        this.updateScoreDisplay();

        // Reset the ball after a shorter delay
        delay(this.resetDelay).then(() => {
          if (this.basketball) {
            try {
              console.log("Resetting basketball...");
              this.basketball.reset({ x: 0, y: 1.5, z: 2 }); // Closer reset position
              this.gameState = "IDLE";
            } catch (error) {
              console.error("Error during reset:", error);
            } finally {
              // Clear the pending reset flag
              this.pendingReset = false;
            }
          }
        });
      }
    }
  }

  handleResize() {
    // Update camera aspect ratio
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose() {
    // Clean up resources when the game is destroyed
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener("resize", this.handleResize);

    // Dispose of Three.js resources
    this.renderer.dispose();

    // Dispose of game objects
    if (this.basketball) this.basketball.dispose();
    if (this.hoop) this.hoop.dispose();
    if (this.inputManager) this.inputManager.dispose();

    // Dispose of physics
    if (this.physics) {
      this.physics.destroy();
    }

    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.physics = null;
    this.basketball = null;
    this.hoop = null;
    this.inputManager = null;
    this.isInitialized = false;
  }

  testShot() {
    if (this.gameState !== "SHOOTING" && this.basketball) {
      console.log("Taking test shot...");

      // Position the ball right on the backboard's top edge
      // Backboard is at z: -5, height is 1.35m, and centered at 3.05m
      // So top edge is at ~3.725m (3.05 + 1.35/2)
      this.basketball.reset({
        x: 0,
        y: 3.725, // Exactly at backboard top edge
        z: -5.1, // Slightly behind backboard to ensure contact
      });

      // Add a slight forward tilt to make it bounce towards the hoop
      const force = new THREE.Vector3(
        0,
        -0.2, // Very gentle downward push
        0.5, // Slight forward tilt to bounce towards hoop
      );

      // Apply the force after a brief delay to let physics settle
      setTimeout(() => {
        this.basketball.applyForce(force);
        this.gameState = "SHOOTING";
        console.log("Drop force applied:", force);
      }, 100);
    }
  }
}

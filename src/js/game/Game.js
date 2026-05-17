import * as THREE from "three";
import { AmmoPhysics, PhysicsLoader } from "@enable3d/ammo-physics";
import { Basketball } from "./Basketball.js";
import { Hoop } from "./Hoop.js";
import { InputManager } from "./InputManager.js";
import { delay } from "../utils/helpers.js";
import { SoundManager } from "../utils/SoundManager.js";
import { EffectsManager } from "../utils/EffectsManager.js";

export class Game {
  constructor() {
    // Canvas element
    this.canvas = document.getElementById("game-canvas");
    this.startScreen = document.getElementById("start-screen");
    this.startButton = document.getElementById("start-button");
    this.startButtonLabel = document.getElementById("start-button-label");
    this.resultBadgeElement = document.getElementById("result-badge");
    this.finalScoreElement = document.getElementById("final-score");
    this.finalBestElement = document.getElementById("final-best");
    this.timerElement = document.getElementById("timer");
    this.shotLabelLayer = document.getElementById("shot-label-layer");

    // Three.js components
    this.scene = null;
    this.camera = null;
    this.cameraBasePosition = new THREE.Vector3();
    this.cameraLookAtTarget = new THREE.Vector3(0, 2.5, -3);
    this.cameraShake = null;
    this.renderer = null;
    this.physics = null;

    // Game objects
    this.basketball = null;
    this.hoop = null;
    this.inputManager = null;
    this.soundManager = new SoundManager();
    this.audioUnlockEvents = [
      "pointerdown",
      "pointerup",
      "touchstart",
      "touchend",
      "mousedown",
      "mouseup",
      "click",
      "keydown",
    ];
    this.startEvents = ["pointerdown", "touchstart", "mousedown", "click"];
    this.effectsManager = null;
    this.ballTrail = null;

    // Game state
    this.isInitialized = false;
    this.animationFrameId = null;
    this.clock = new THREE.Clock();
    this.score = 0;
    this.scoreElement = document.getElementById("score");
    this.highScore = this.loadHighScore();
    this.streak = 0; // Current streak of successful baskets
    this.gameState = "IDLE"; // IDLE, AIMING, SHOOTING, SCORED, RESET
    this.roundState = "READY"; // READY, RUNNING, ENDED
    this.roundDuration = 60;
    this.timeRemaining = this.roundDuration;
    this.pendingReset = false; // Flag to track if a reset is already scheduled
    this.hasStarted = !this.startScreen;
    this.shotStartTime = 0; // Track when a shot starts
    this.maxShotTime = 1500; // Maximum time for a shot (1.5 seconds)
    this.resetDelay = 800; // Shorter reset delay (800ms)
    this.pointsPerMake = 2;
    this.currentShot = null;
    this.lastBallPosition = null; // Previous frame position used for rim-plane scoring

    // Initialize score display
    this.updateScoreDisplay();
    this.updateTimerDisplay();
    this.updateStartScreen("READY");

    // Bind methods
    this.update = this.update.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.initPhysics = this.initPhysics.bind(this);
    this.handleSwipe = this.handleSwipe.bind(this);
    this.handleStart = this.handleStart.bind(this);
    this.handleAudioUnlock = this.handleAudioUnlock.bind(this);
    this.testShot = this.testShot.bind(this);

    if (this.startButton) {
      this.startEvents.forEach((eventName) => {
        this.startButton.addEventListener(eventName, this.handleStart, {
          passive: false,
        });
      });
    }

    // Add keyboard listener for test shot
    window.addEventListener("keydown", (e) => {
      this.handleAudioUnlock();

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
      let streakEmoji = "";
      let streakClass = "";

      if (this.streak >= 5) {
        streakEmoji = "🔥🔥🔥";
        streakClass = "streak-fire";
      } else if (this.streak >= 3) {
        streakEmoji = "🔥🔥";
        streakClass = "streak-hot";
      } else if (this.streak > 1) {
        streakEmoji = "🔥";
        streakClass = "streak-warm";
      }

      this.scoreElement.innerHTML = `
        <div class="score-main">Score: <span class="score-value">${this.score}</span></div>
        <div class="high-score">Best: ${this.highScore}</div>
        ${
          this.streak > 1
            ? `<div class="streak ${streakClass}">
            <span class="streak-label">STREAK</span>
            <span class="streak-value">${this.streak}x ${streakEmoji}</span>
          </div>`
            : ""
        }
      `;
    }
  }

  updateTimerDisplay() {
    if (!this.timerElement) return;

    const seconds = Math.max(0, Math.ceil(this.timeRemaining));
    this.timerElement.textContent = seconds.toString().padStart(2, "0");
    this.timerElement.classList.toggle(
      "is-warning",
      this.roundState === "RUNNING" && seconds <= 10,
    );
  }

  updateStartScreen(mode = this.roundState) {
    if (!this.startButton) return;

    const isEnded = mode === "ENDED";

    if (this.startScreen) {
      this.startScreen.classList.toggle("is-ended", isEnded);
    }

    if (this.finalScoreElement) {
      this.finalScoreElement.textContent = this.score.toString();
    }
    if (this.finalBestElement) {
      this.finalBestElement.textContent = this.highScore.toString();
    }
    if (this.resultBadgeElement) {
      this.resultBadgeElement.textContent = this.getRunResultLabel();
    }

    if (this.startButtonLabel) {
      this.startButtonLabel.textContent = isEnded ? "Play Again" : "Start";
    } else {
      this.startButton.textContent = isEnded ? "Play Again" : "Start";
    }
  }

  getRunResultLabel() {
    if (this.score <= 0) return "Try Again";
    if (this.score >= this.highScore && this.highScore > 0) return "Best Run";
    if (this.score >= 30) return "Heat Check";
    if (this.score >= 20) return "Hot Run";
    if (this.score >= 10) return "Nice Touch";
    return "On Board";
  }

  hideStartScreen() {
    if (!this.startScreen) return;

    this.startScreen.classList.add("is-hidden");
    this.startScreen.setAttribute("aria-hidden", "true");
  }

  showStartScreen(mode = this.roundState) {
    this.updateStartScreen(mode);

    if (!this.startScreen) return;

    this.startScreen.classList.remove("is-hidden");
    this.startScreen.setAttribute("aria-hidden", "false");
  }

  startRound() {
    this.score = 0;
    this.streak = 0;
    this.timeRemaining = this.roundDuration;
    this.roundState = "RUNNING";
    this.gameState = "IDLE";
    this.pendingReset = false;
    this.hasStarted = true;
    this.currentShot = null;
    this.lastBallPosition = null;

    if (this.basketball) {
      this.basketball.reset({ x: 0, y: 1.5, z: 0 });
    }

    this.updateScoreDisplay();
    this.updateTimerDisplay();
    this.hideStartScreen();

    if (this.soundManager) {
      this.soundManager.playMusic();
    }
  }

  endRound() {
    if (this.roundState === "ENDED") return;

    this.roundState = "ENDED";
    this.hasStarted = false;
    this.pendingReset = false;
    this.currentShot = null;
    this.lastBallPosition = null;
    this.gameState = "ROUND_OVER";

    if (this.ballTrail && this.effectsManager) {
      this.effectsManager.clearBallTrail(this.ballTrail);
      this.ballTrail = null;
    }

    if (this.basketball) {
      this.basketball.reset({ x: 0, y: 1.5, z: 0 });
    }

    this.updateScoreDisplay();
    this.updateTimerDisplay();
    this.showStartScreen("ENDED");
  }

  init() {
    if (this.isInitialized) return;

    // We'll initialize the scene, camera, and renderer first
    this.initGraphics();

    // Then load the physics
    PhysicsLoader("/lib", this.initPhysics);
  }

  initGraphics() {
    const { width, height } = this.getViewportSize();

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Create camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 2.5, 4); // Moved closer to the hoop
    this.cameraBasePosition.copy(this.camera.position);
    this.camera.lookAt(this.cameraLookAtTarget); // Look towards the hoop

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height, false);
    this.renderer.shadowMap.enabled = true;

    // Add lights
    this.setupLights();

    // Add event listeners
    window.addEventListener("resize", this.handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", this.handleResize);
    }
  }

  getViewportSize() {
    const width =
      this.canvas?.clientWidth ||
      window.visualViewport?.width ||
      window.innerWidth;
    const height =
      this.canvas?.clientHeight ||
      window.visualViewport?.height ||
      window.innerHeight;

    return {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    };
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

    // Initialize sound and effects managers
    this.setupAudioUnlockEvents();
    this.effectsManager = new EffectsManager(this.scene);

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
      { phong: { color: 0xc19a6b, transparent: false, opacity: 1 } }, // Wood color
    );

    // Set bounciness
    ground.body.setBounciness(1);

    // Add court markings
    this.addCourtMarkings();
  }

  addCourtMarkings() {
    const lineHeight = 0.05;
    const lineWidth = 0.1;
    const yPosition = 0.55;

    // Bright white material
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    // Dark wood stripes
    const darkWoodMaterial = new THREE.MeshBasicMaterial({
      color: 0x5c3a1e,
    });

    // Paint/Key area dimensions
    const freeThrowCircleRadius = 1.7;
    const keyWidth = freeThrowCircleRadius * 2; // Width matches circle diameter
    const courtEdgeZ = -10; // Edge of the court (baseline)
    const baselineZ = courtEdgeZ; // Baseline at court edge
    const freeThrowLineZ = baselineZ + 5.8; // Free throw line distance from baseline
    const keyDepth = freeThrowLineZ - baselineZ;

    // Baseline (under the hoop)
    const baseline = new THREE.Mesh(
      new THREE.BoxGeometry(keyWidth, lineHeight, lineWidth),
      lineMaterial,
    );
    baseline.position.set(0, yPosition, baselineZ);
    this.scene.add(baseline);

    // Key area - left vertical line
    const leftKeyLine = new THREE.Mesh(
      new THREE.BoxGeometry(lineWidth, lineHeight, keyDepth),
      lineMaterial,
    );
    leftKeyLine.position.set(
      -keyWidth / 2,
      yPosition,
      baselineZ + keyDepth / 2,
    );
    this.scene.add(leftKeyLine);

    // Key area - right vertical line
    const rightKeyLine = new THREE.Mesh(
      new THREE.BoxGeometry(lineWidth, lineHeight, keyDepth),
      lineMaterial,
    );
    rightKeyLine.position.set(
      keyWidth / 2,
      yPosition,
      baselineZ + keyDepth / 2,
    );
    this.scene.add(rightKeyLine);

    // Free throw line (top of the key)
    const freeThrowLine = new THREE.Mesh(
      new THREE.BoxGeometry(keyWidth, lineHeight, lineWidth),
      lineMaterial,
    );
    freeThrowLine.position.set(0, yPosition, freeThrowLineZ);
    this.scene.add(freeThrowLine);

    // Free throw circle (top of key) - diameter matches key width
    const freeThrowCircle = new THREE.Mesh(
      new THREE.RingGeometry(
        freeThrowCircleRadius,
        freeThrowCircleRadius + 0.1,
        64,
      ),
      lineMaterial,
    );
    freeThrowCircle.rotation.x = -Math.PI / 2;
    freeThrowCircle.position.set(0, yPosition + 0.01, freeThrowLineZ);
    this.scene.add(freeThrowCircle);

    // Three-point arc (centered to align with court edge and intersect with free throw circle)
    const threePtRadius = 3.775; // Adjusted to intersect with top of free throw circle
    const threePtSegments = 48;

    // Calculate the center of the three-point arc so it's flush with court edge
    const threePtCenterZ = courtEdgeZ + threePtRadius;

    const threePtStartAngle = 0; // Start at 0 degrees (facing player, right side)
    const threePtEndAngle = Math.PI; // End at 180 degrees (facing player, left side)

    for (let i = 0; i < threePtSegments; i++) {
      const angle1 =
        threePtStartAngle +
        (i / threePtSegments) * (threePtEndAngle - threePtStartAngle);
      const angle2 =
        threePtStartAngle +
        ((i + 1) / threePtSegments) * (threePtEndAngle - threePtStartAngle);

      const x1 = Math.cos(angle1) * threePtRadius;
      const z1 = threePtCenterZ + Math.sin(angle1) * threePtRadius;
      const x2 = Math.cos(angle2) * threePtRadius;
      const z2 = threePtCenterZ + Math.sin(angle2) * threePtRadius;

      const segmentLength = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
      const segmentAngle = Math.atan2(z2 - z1, x2 - x1);

      const arcSegment = new THREE.Mesh(
        new THREE.BoxGeometry(segmentLength, lineHeight, lineWidth),
        lineMaterial,
      );
      arcSegment.position.set((x1 + x2) / 2, yPosition, (z1 + z2) / 2);
      arcSegment.rotation.y = -segmentAngle;
      this.scene.add(arcSegment);
    }

    // Three-point straight lines from arc to court edge (left and right)
    const threePtSideLength = Math.abs(courtEdgeZ - threePtCenterZ);

    // Left three-point line
    const leftThreePtLine = new THREE.Mesh(
      new THREE.BoxGeometry(lineWidth, lineHeight, threePtSideLength),
      lineMaterial,
    );
    leftThreePtLine.position.set(
      -threePtRadius,
      yPosition,
      courtEdgeZ + threePtSideLength / 2,
    );
    this.scene.add(leftThreePtLine);

    // Right three-point line
    const rightThreePtLine = new THREE.Mesh(
      new THREE.BoxGeometry(lineWidth, lineHeight, threePtSideLength),
      lineMaterial,
    );
    rightThreePtLine.position.set(
      threePtRadius,
      yPosition,
      courtEdgeZ + threePtSideLength / 2,
    );
    this.scene.add(rightThreePtLine);

    // Wood grain planks
    for (let i = -10; i <= 10; i += 1.2) {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, lineHeight * 0.5, 20),
        darkWoodMaterial,
      );
      plank.position.set(i, yPosition - 0.02, 0);
      this.scene.add(plank);
    }

    console.log("Full court markings added");
  }

  createGameObjects() {
    // Create the basketball
    this.basketball = new Basketball(this.physics, this.scene, {
      position: { x: 0, y: 1.5, z: 0 }, // Moved closer to the hoop
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
      onInteractionStart: this.handleAudioUnlock,
    });

    // Add trajectory line to scene if it exists
    const trajectoryLine = this.inputManager.getTrajectoryLine();
    if (trajectoryLine) {
      this.scene.add(trajectoryLine);
    }
  }

  setupAudioUnlockEvents() {
    this.audioUnlockEvents.forEach((eventName) => {
      window.addEventListener(eventName, this.handleAudioUnlock, {
        once: true,
        passive: true,
      });
    });
  }

  handleAudioUnlock() {
    if (this.soundManager) {
      this.soundManager.unlock();
    }
  }

  handleStart(event) {
    if (event) event.preventDefault();
    if (this.roundState === "RUNNING") return;

    this.handleAudioUnlock();

    this.startRound();
  }

  handleSwipe(force, isPreview = false) {
    // Only allow shooting if the ball is not already in motion
    if (
      this.hasStarted &&
      this.roundState === "RUNNING" &&
      this.gameState !== "SHOOTING" &&
      !this.pendingReset &&
      this.basketball
    ) {
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
        this.startShotTracking();
        this.lastBallPosition = this.basketball.getPosition();
        this.basketball.applyForce(modifiedForce);
        this.gameState = "SHOOTING";

        // Record the shot start time
        this.shotStartTime = Date.now();

        // Hide the trajectory line
        this.inputManager.hideTrajectoryLine();

        // Create ball trail effect
        if (this.effectsManager) {
          this.ballTrail = this.effectsManager.createBallTrail(
            this.basketball.mesh,
          );
        }

        console.log("Shot taken with force:", modifiedForce);
      }
    }
  }

  updateRound(delta) {
    if (this.roundState !== "RUNNING") return;

    this.timeRemaining = Math.max(0, this.timeRemaining - delta / 1000);
    this.updateTimerDisplay();

    if (this.timeRemaining <= 0) {
      this.endRound();
    }
  }

  startShotTracking() {
    const ballPosition = this.basketball.getPosition();

    this.currentShot = {
      hitBackboard: false,
      hitRim: false,
      lastImpactTime: 0,
      maxHeight: ballPosition.y,
    };
  }

  updateShotTracking() {
    if (
      this.roundState !== "RUNNING" ||
      this.gameState !== "SHOOTING" ||
      !this.currentShot ||
      !this.basketball ||
      !this.hoop
    ) {
      return;
    }

    const position = this.basketball.getPosition();
    const velocity = this.basketball.getVelocity();
    const speed = velocity.length();
    const ballRadius = this.basketball.config.radius;

    this.currentShot.maxHeight = Math.max(
      this.currentShot.maxHeight,
      position.y,
    );

    if (speed < 0.35) return;

    const now = performance.now();
    if (now - this.currentShot.lastImpactTime < 220) return;

    if (this.isNearRimImpact(position, ballRadius)) {
      this.currentShot.hitRim = true;
      this.currentShot.lastImpactTime = now;
      this.triggerCameraShake(Math.min(1, speed / 10), 170);
      return;
    }

    if (this.isNearBackboardImpact(position, ballRadius)) {
      this.currentShot.hitBackboard = true;
      this.currentShot.lastImpactTime = now;
      this.triggerCameraShake(Math.min(1.25, speed / 8), 210);
    }
  }

  isNearRimImpact(position, ballRadius) {
    if (!this.hoop || !this.hoop.rim) return false;

    const rimCenter = new THREE.Vector3();
    this.hoop.rim.getWorldPosition(rimCenter);

    const dx = position.x - rimCenter.x;
    const dz = position.z - rimCenter.z;
    const distanceFromCenter = Math.sqrt(dx * dx + dz * dz);
    const distanceFromRing = Math.abs(
      distanceFromCenter - this.hoop.config.rimRadius,
    );
    const isNearPlane = Math.abs(position.y - rimCenter.y) <= ballRadius * 1.35;

    return isNearPlane && distanceFromRing <= ballRadius * 0.7;
  }

  isNearBackboardImpact(position, ballRadius) {
    if (!this.hoop) return false;

    const { config } = this.hoop;
    const backboardX = config.position.x;
    const backboardY =
      config.position.y + (config.backboardHeight / 2 - config.rimRadius);
    const backboardZ =
      config.position.z -
      config.backboardDistFromRim -
      config.backboardThickness / 2;

    const isNearPlane = Math.abs(position.z - backboardZ) <= ballRadius * 1.15;
    const isWithinWidth =
      Math.abs(position.x - backboardX) <=
      config.backboardWidth / 2 + ballRadius;
    const isWithinHeight =
      Math.abs(position.y - backboardY) <=
      config.backboardHeight / 2 + ballRadius;

    return isNearPlane && isWithinWidth && isWithinHeight;
  }

  getShotLabel(scored, missReason = "") {
    if (scored) {
      if (this.currentShot?.hitBackboard) return "BANK";
      if (this.currentShot?.hitRim) return "SHOOTER'S BOUNCE";
      return "SWISH";
    }

    if (!this.currentShot?.hitBackboard && !this.currentShot?.hitRim) {
      return missReason === "shotTimeExceeded" ? "SHORT" : "AIRBALL";
    }

    return "BRICK";
  }

  showShotLabel(text, tone = "made") {
    if (!this.shotLabelLayer || !this.camera) return;

    const hoopPosition = new THREE.Vector3(0, 3.55, -5);
    hoopPosition.project(this.camera);
    const { width, height } = this.getViewportSize();

    const label = document.createElement("div");
    label.className = `shot-label shot-label--${tone}`;
    label.textContent = text;
    label.style.left = `${(hoopPosition.x * 0.5 + 0.5) * width}px`;
    label.style.top = `${(-hoopPosition.y * 0.5 + 0.5) * height}px`;

    this.shotLabelLayer.appendChild(label);

    setTimeout(() => {
      label.remove();
    }, 900);
  }

  triggerCameraShake(intensity = 0.5, duration = 180) {
    if (!this.camera) return;

    const currentIntensity = this.cameraShake?.intensity || 0;
    this.cameraShake = {
      duration,
      elapsed: 0,
      intensity: Math.max(currentIntensity, intensity),
    };
  }

  updateCameraShake(delta) {
    if (!this.camera) return;

    if (!this.cameraShake) {
      this.camera.position.copy(this.cameraBasePosition);
      this.camera.lookAt(this.cameraLookAtTarget);
      return;
    }

    this.cameraShake.elapsed += delta;
    const progress = Math.min(
      1,
      this.cameraShake.elapsed / this.cameraShake.duration,
    );
    const amplitude = this.cameraShake.intensity * (1 - progress) * 0.05;

    this.camera.position.set(
      this.cameraBasePosition.x + (Math.random() - 0.5) * amplitude,
      this.cameraBasePosition.y + (Math.random() - 0.5) * amplitude,
      this.cameraBasePosition.z + (Math.random() - 0.5) * amplitude,
    );
    this.camera.lookAt(this.cameraLookAtTarget);

    if (progress >= 1) {
      this.cameraShake = null;
      this.camera.position.copy(this.cameraBasePosition);
      this.camera.lookAt(this.cameraLookAtTarget);
    }
  }

  update() {
    this.animationFrameId = requestAnimationFrame(this.update);

    // Update physics if initialized
    if (this.physics) {
      const delta = this.clock.getDelta() * 1000;
      this.updateRound(delta);
      this.physics.update(delta);
      this.physics.updateDebugger();

      // Update game objects
      if (this.basketball) this.basketball.update();
      if (this.hoop) this.hoop.update();

      // Update effects
      if (this.effectsManager) {
        this.effectsManager.update(delta);

        // Update ball trail during flight
        if (this.ballTrail && this.gameState === "SHOOTING") {
          this.effectsManager.updateBallTrail(
            this.ballTrail,
            this.basketball.getPosition(),
          );
        }
      }

      this.updateShotTracking();

      if (this.roundState === "RUNNING") {
        // Check for basket made
        this.checkForBasket();

        // Check ball state
        this.checkBallState();
      }

      this.updateCameraShake(delta);

      if (this.soundManager) {
        this.soundManager.ensureMusicPlaying();
      }
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
      const currentPosition = this.basketball.getPosition();

      if (!this.lastBallPosition) {
        this.lastBallPosition = currentPosition;
        return;
      }

      // Check if ball is passing through the hoop from top to bottom
      const scored =
        velocity.y < 0 &&
        this.hoop.checkBasket(this.basketball.mesh, this.lastBallPosition);

      this.lastBallPosition = currentPosition;

      if (scored) {
        const points = this.pointsPerMake;
        const shotLabel = this.getShotLabel(true);

        // Increment score
        this.score += points;

        // Increment streak
        this.streak++;

        // Check for high score
        const isNewHighScore = this.score > this.highScore;
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

        // Play success sound and visual effects
        this.showScoreEffect(points, shotLabel);

        // Play score sound
        if (this.soundManager) {
          if (isNewHighScore && this.score > points) {
            this.soundManager.playHighScore();
          } else {
            this.soundManager.playScore(this.streak);
          }
        }

        // Create visual effects
        if (this.effectsManager) {
          const hoopPos = new THREE.Vector3(0, 3.05, -5);
          this.effectsManager.createScoreExplosion(hoopPos);

          // Extra effects for streaks
          if (this.streak >= 3) {
            this.effectsManager.createConfetti(hoopPos, this.streak);
            this.effectsManager.createHoopGlow(hoopPos, this.streak);
          }
        }

        // Clear ball trail
        if (this.ballTrail && this.effectsManager) {
          this.effectsManager.clearBallTrail(this.ballTrail);
          this.ballTrail = null;
        }

        setTimeout(() => {
          if (this.gameState === "SCORED" && this.roundState === "RUNNING") {
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
      this.basketball.reset({ x: 0, y: 1.5, z: 0 }); // Moved closer to the hoop
      this.currentShot = null;
      this.lastBallPosition = null;
      this.gameState = "IDLE";
    } catch (error) {
      console.error("Error during reset after score:", error);
    } finally {
      // Clear the pending reset flag
      this.pendingReset = false;
    }
  }

  // Show a visual effect when scoring
  showScoreEffect(points, shotLabel) {
    this.showShotLabel(`${shotLabel} +${points}`, "made");
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
        const missReason = isTooFar
          ? "isTooFar"
          : isBelowGround
            ? "isBelowGround"
            : hasStopped
              ? "hasStopped"
              : "shotTimeExceeded";
        const missLabel = this.getShotLabel(false, missReason);

        // Set the pending reset flag to prevent multiple reset attempts
        this.pendingReset = true;

        // Update game state
        this.gameState = "RESET";

        // Reset streak when missing a shot
        this.streak = 0;

        // Update the score display to show the reset streak
        this.updateScoreDisplay();
        this.showShotLabel(missLabel, "miss");

        // Play miss sound
        if (this.soundManager) this.soundManager.playMiss();

        // Clear ball trail
        if (this.ballTrail && this.effectsManager) {
          this.effectsManager.clearBallTrail(this.ballTrail);
          this.ballTrail = null;
        }

        // Reset the ball after a shorter delay
        delay(this.resetDelay).then(() => {
          if (this.basketball && this.roundState === "RUNNING") {
            try {
              console.log("Resetting basketball...");
              this.basketball.reset({ x: 0, y: 1.5, z: 0 }); // Moved closer to the hoop
              this.currentShot = null;
              this.lastBallPosition = null;
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
    if (!this.camera || !this.renderer) return;

    const { width, height } = this.getViewportSize();

    // Update camera aspect ratio
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Update renderer size
    this.renderer.setSize(width, height, false);
  }

  dispose() {
    // Clean up resources when the game is destroyed
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener("resize", this.handleResize);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener("resize", this.handleResize);
    }
    this.audioUnlockEvents.forEach((eventName) => {
      window.removeEventListener(eventName, this.handleAudioUnlock);
    });
    if (this.startButton) {
      this.startEvents.forEach((eventName) => {
        this.startButton.removeEventListener(eventName, this.handleStart);
      });
    }

    // Dispose of Three.js resources
    this.renderer.dispose();

    // Dispose of game objects
    if (this.basketball) this.basketball.dispose();
    if (this.hoop) this.hoop.dispose();
    if (this.inputManager) this.inputManager.dispose();

    // Dispose of effects manager
    if (this.effectsManager) this.effectsManager.dispose();

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
    if (
      this.roundState === "RUNNING" &&
      this.gameState !== "SHOOTING" &&
      this.basketball
    ) {
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
        this.startShotTracking();
        this.lastBallPosition = this.basketball.getPosition();
        this.basketball.applyForce(force);
        this.gameState = "SHOOTING";
        console.log("Drop force applied:", force);
      }, 100);
    }
  }
}

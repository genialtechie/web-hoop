import * as THREE from "three";
import { AmmoPhysics, PhysicsLoader } from "@enable3d/ammo-physics";
import { Basketball } from "./Basketball.js";
import { Hoop } from "./Hoop.js";

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

    // Game state
    this.isInitialized = false;
    this.animationFrameId = null;
    this.clock = new THREE.Clock();
    this.score = 0;
    this.scoreElement = document.getElementById("score");

    // Bind methods
    this.update = this.update.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.initPhysics = this.initPhysics.bind(this);
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
    const aspectRatio = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 1, 0);

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

    // Enable debug rendering during development
    this.physics.debug.enable(true);

    // Create ground with physics
    this.createGround();

    // Create basketball and hoop
    this.createGameObjects();

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

    // Add a physical ground plane
    this.physics.add.ground(
      { width, height, depth: 1 },
      { phong: { color: 0x2e8b57, transparent: true, opacity: 0.8 } },
    );
  }

  createGameObjects() {
    // Create the basketball
    this.basketball = new Basketball(this.physics, this.scene, {
      position: { x: 0, y: 1, z: 0 }, // Moved closer to the hoop (was z: 3)
    });

    // Create the hoop and backboard
    this.hoop = new Hoop(this.physics, this.scene, {
      position: { x: 0, y: 3.05, z: -3 }, // Moved closer to the player (was z: -5)
    });
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
    }

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  checkForBasket() {
    // Only check if both the basketball and hoop exist
    if (
      this.basketball &&
      this.hoop &&
      this.basketball.mesh &&
      this.hoop.triggerZone
    ) {
      // Get the ball's velocity to ensure it's moving downward through the hoop
      const velocity = this.basketball.getVelocity();

      // Check if ball is passing through the hoop from top to bottom
      if (velocity.y < 0 && this.hoop.checkBasket(this.basketball.mesh)) {
        // Increment score
        this.score++;

        // Update the score display
        if (this.scoreElement) {
          this.scoreElement.textContent = `Score: ${this.score}`;
        }

        // Optionally, add visual feedback, sound effects, etc.
        console.log("Basket made! Score:", this.score);

        // Reset the ball after scoring (with a slight delay)
        setTimeout(() => {
          this.basketball.reset({ x: 0, y: 1, z: 0 });
        }, 1000);
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
    this.isInitialized = false;
  }
}

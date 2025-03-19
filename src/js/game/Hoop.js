import * as THREE from "three";

export class Hoop {
  constructor(physics, scene, options = {}) {
    // Store references
    this.physics = physics;
    this.scene = scene;

    // Configuration with defaults
    this.config = {
      position: options.position || { x: 0, y: 3.05, z: -5 }, // Regulation height is 3.05m (10 feet)
      rimRadius: options.rimRadius || 0.225, // 45cm diameter
      rimTubeRadius: options.rimTubeRadius || 0.025, // 5cm tube diameter
      backboardWidth: options.backboardWidth || 1.8, // 180cm width
      backboardHeight: options.backboardHeight || 1.05, // 105cm height
      backboardThickness: options.backboardThickness || 0.05, // 5cm thickness
      backboardDistFromRim: options.backboardDistFromRim || 0.15, // 15cm from rim center to backboard
      netHeight: options.netHeight || 0.4, // 40cm net height
    };

    // Properties
    this.rim = null;
    this.backboard = null;
    this.net = null;
    this.triggerZone = null;
    this.group = new THREE.Group(); // Container for all hoop components

    // Add group to scene
    this.scene.add(this.group);

    // Create the hoop components
    this.create();
  }

  create() {
    // Create the hoop assembly
    this.createRim();
    this.createBackboard();
    this.createNet();
    this.createTriggerZone();

    // Position the hoop assembly
    this.group.position.set(
      this.config.position.x,
      this.config.position.y,
      this.config.position.z,
    );

    return this;
  }

  createRim() {
    // Create a torus for the rim
    const geometry = new THREE.TorusGeometry(
      this.config.rimRadius,
      this.config.rimTubeRadius,
      16,
      32,
    );

    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: 0xff4500, // Orange-red color
      metalness: 0.8,
      roughness: 0.3,
    });

    // Create mesh
    const rimMesh = new THREE.Mesh(geometry, material);

    // Rotate the rim to be horizontal (facing up)
    rimMesh.rotation.x = Math.PI / 2;

    // Add to group
    this.group.add(rimMesh);

    // Add physics to the rim
    // eslint-disable-next-line no-unused-vars
    const rimBody = this.physics.add.existing(rimMesh, {
      shape: "concave",
      mass: 0, // Static body
      collisionFlags: 1, // Static body
    });

    // Store reference
    this.rim = rimMesh;

    return rimMesh;
  }

  createBackboard() {
    // Create backboard
    const geometry = new THREE.BoxGeometry(
      this.config.backboardWidth,
      this.config.backboardHeight,
      this.config.backboardThickness,
    );

    // Create a semi-transparent material for the backboard
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff, // White
      transparent: true,
      opacity: 0.7,
      metalness: 0.1,
      roughness: 0.2,
    });

    // Create mesh
    const backboardMesh = new THREE.Mesh(geometry, material);

    // Position the backboard relative to the rim (behind it)
    backboardMesh.position.z =
      -this.config.backboardDistFromRim - this.config.backboardThickness / 2;
    backboardMesh.position.y =
      this.config.backboardHeight / 2 - this.config.rimRadius;

    // Add to group
    this.group.add(backboardMesh);

    // Add physics to the backboard
    // eslint-disable-next-line no-unused-vars
    const backboardBody = this.physics.add.existing(backboardMesh, {
      shape: "box",
      mass: 0, // Static body
      collisionFlags: 1, // Static body
    });

    // Store reference
    this.backboard = backboardMesh;

    // Add the square on the backboard
    this.createBackboardSquare();

    return backboardMesh;
  }

  createBackboardSquare() {
    // Create a square outline on the backboard
    const squareWidth = 0.59; // 59cm width
    const squareHeight = 0.45; // 45cm height
    // eslint-disable-next-line no-unused-vars
    const lineWidth = 0.02; // 2cm line width

    // Create lines for the square
    const material = new THREE.LineBasicMaterial({
      color: 0xff0000,
      linewidth: 2,
    });

    // Create the square as a shape
    const shape = new THREE.Shape();
    shape.moveTo(-squareWidth / 2, -squareHeight / 2);
    shape.lineTo(squareWidth / 2, -squareHeight / 2);
    shape.lineTo(squareWidth / 2, squareHeight / 2);
    shape.lineTo(-squareWidth / 2, squareHeight / 2);
    shape.lineTo(-squareWidth / 2, -squareHeight / 2);

    const geometry = new THREE.ShapeGeometry(shape);
    const square = new THREE.Line(geometry, material);

    // Position the square on the backboard
    square.position.z = this.config.backboardThickness / 2 + 0.001; // Slightly in front
    square.position.y =
      this.config.backboardHeight / 2 - this.config.rimRadius - 0.1; // Above the rim

    // Add to backboard
    this.backboard.add(square);

    return square;
  }

  createNet() {
    // Create a simple representation of a net
    // In a complete implementation, this could be a cloth simulation

    // Create a conical mesh to represent the net
    const geometry = new THREE.ConeGeometry(
      this.config.rimRadius,
      this.config.netHeight,
      16,
      1,
      true, // Open ended
    );

    // Create material - white, transparent mesh
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      wireframe: true,
      side: THREE.DoubleSide,
    });

    // Create mesh
    const netMesh = new THREE.Mesh(geometry, material);

    // Position the net below the rim
    netMesh.position.y = -this.config.netHeight / 2;

    // Add to rim
    this.rim.add(netMesh);

    // Store reference
    this.net = netMesh;

    return netMesh;
  }

  createTriggerZone() {
    // Create an invisible trigger zone for detecting baskets
    // This is a cylinder that detects when the ball passes through the hoop

    // Create a cylinder geometry slightly smaller than the rim
    const geometry = new THREE.CylinderGeometry(
      this.config.rimRadius * 0.8, // Slightly smaller than the rim
      this.config.rimRadius * 0.8,
      0.1, // Short height
      16,
    );

    // Create an invisible material
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0, // Invisible
      depthWrite: false,
    });

    // Create mesh
    const triggerMesh = new THREE.Mesh(geometry, material);

    // Position the trigger zone below the rim
    triggerMesh.position.y = -0.1;

    // Add to rim
    this.rim.add(triggerMesh);

    // Store reference
    this.triggerZone = triggerMesh;

    return triggerMesh;
  }

  /**
   * Check if a ball has passed through the hoop
   * @param {THREE.Object3D} ball The ball to check
   * @returns {boolean} True if the ball passed through the hoop
   */
  checkBasket(ball) {
    // Convert ball position to local space of the trigger zone
    const ballLocalPos = this.triggerZone.worldToLocal(ball.position.clone());

    // Check if ball is within the trigger zone's radius and height
    const isWithinRadius =
      Math.sqrt(
        ballLocalPos.x * ballLocalPos.x + ballLocalPos.z * ballLocalPos.z,
      ) <
      this.config.rimRadius * 0.8;
    const isWithinHeight = Math.abs(ballLocalPos.y) < 0.1;

    return isWithinRadius && isWithinHeight;
  }

  /**
   * Update the hoop
   */
  update() {
    // Any per-frame updates for the hoop
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Clean up resources associated with the hoop

    // Remove from scene
    this.scene.remove(this.group);

    // Dispose of geometries and materials
    if (this.rim) {
      if (this.rim.geometry) this.rim.geometry.dispose();
      if (this.rim.material) this.rim.material.dispose();
    }

    if (this.backboard) {
      if (this.backboard.geometry) this.backboard.geometry.dispose();
      if (this.backboard.material) this.backboard.material.dispose();
    }

    if (this.net) {
      if (this.net.geometry) this.net.geometry.dispose();
      if (this.net.material) this.net.material.dispose();
    }

    if (this.triggerZone) {
      if (this.triggerZone.geometry) this.triggerZone.geometry.dispose();
      if (this.triggerZone.material) this.triggerZone.material.dispose();
    }
  }
}

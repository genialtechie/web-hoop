import * as THREE from "three";

export class Hoop {
  constructor(physics, scene, options = {}) {
    // Store references
    this.physics = physics;
    this.scene = scene;

    // Configuration with defaults
    this.config = {
      position: options.position || { x: 0, y: 3.05, z: -4 }, // Moved closer (from -5 to -4)
      rimRadius: options.rimRadius || 0.4, // 80cm diameter
      rimTubeRadius: options.rimTubeRadius || 0.05, // 10cm tube diameter
      backboardWidth: options.backboardWidth || 2.4, // Increased from 1.8m to 2.4m width
      backboardHeight: options.backboardHeight || 1.35, // Increased from 1.05m to 1.35m height
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
    const { rimRadius, rimTubeRadius } = this.config;

    // Create a torus for the visual rim
    const geometry = new THREE.TorusGeometry(rimRadius, rimTubeRadius, 16, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff4500,
      metalness: 0.8,
      roughness: 0.3,
    });

    // Create mesh
    const rimMesh = new THREE.Mesh(geometry, material);
    rimMesh.rotation.x = Math.PI / 2;
    this.group.add(rimMesh);
    this.rim = rimMesh;

    // Create a single compounded physics rim using the group's position
    const pos = this.config.position;

    // Create a ring of spheres for the rim physics that stays in place
    const numSegments = 12;
    for (let i = 0; i < numSegments; i++) {
      const angle = (i / numSegments) * Math.PI * 2;
      const x = pos.x + rimRadius * Math.cos(angle);
      const y = pos.y;
      const z = pos.z + rimRadius * Math.sin(angle);

      // Create physics sphere
      const ball = this.physics.add.sphere(
        {
          radius: rimTubeRadius,
          x: x,
          y: y,
          z: z,
          mass: 0,
          collisionFlags: 1,
          friction: 0.3,
          restitution: 0.7,
        },
        {
          phong: {
            color: 0xff4500,
            opacity: 0,
            transparent: true,
          },
        },
      );

      // Make the sphere invisible but keep physics
      ball.visible = false;
    }

    return rimMesh;
  }

  createBackboard() {
    const pos = this.config.position;
    const {
      backboardWidth,
      backboardHeight,
      backboardThickness,
      backboardDistFromRim,
      rimRadius,
    } = this.config;

    // Calculate the absolute position of the backboard
    const backboardX = pos.x;
    const backboardY = pos.y + (backboardHeight / 2 - rimRadius);
    const backboardZ = pos.z - backboardDistFromRim - backboardThickness / 2;

    // Create backboard with direct physics at the absolute position
    const backboardBody = this.physics.add.box(
      {
        width: backboardWidth,
        height: backboardHeight,
        depth: backboardThickness,
        x: backboardX,
        y: backboardY,
        z: backboardZ,
        mass: 0,
        collisionFlags: 1,
        friction: 0.8,
        restitution: 0.6,
        metalness: 0.4,
        roughness: 0.2,
      },
      {
        phong: {
          color: 0xffffff,
        },
      },
    );

    // Store reference
    this.backboard = backboardBody;

    // Don't add to group - it would double-transform
    // Instead, manually position the visual elements

    // Add the square on the backboard
    this.createBackboardSquare();

    return backboardBody;
  }

  createBackboardSquare() {
    if (!this.backboard) return null;

    // Create a square outline on the backboard
    const squareWidth = 0.59; // 59cm width
    const squareHeight = 0.45; // 45cm height
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
    triggerMesh.position.y = -0.05; // Moved closer to the rim (was -0.1)

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
    const isWithinHeight = Math.abs(ballLocalPos.y) < 0.15; // Increased detection height (was 0.1)

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

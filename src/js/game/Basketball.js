import * as THREE from "three";

export class Basketball {
  constructor(physics, scene, options = {}) {
    // Store references
    this.physics = physics;
    this.scene = scene;

    // Configuration with defaults
    this.config = {
      radius: options.radius || 0.24, // 24cm - regulation basketball size
      mass: options.mass || 0.6, // 600g - regulation basketball weight
      position: options.position || { x: 0, y: 1, z: 0 },
      friction: options.friction || 0.5,
      color: options.color || 0xf85e00, // Orange
    };

    // Properties
    this.mesh = null;
    this.body = null;
    this.isReset = false;

    // Create the basketball
    this.create();
  }

  create() {
    // Create the basketball using the physics factory
    const { radius, mass, position, color } = this.config;

    // Create the ball with physics
    const ball = this.physics.add.sphere(
      {
        radius,
        x: position.x,
        y: position.y,
        z: position.z,
        mass: mass * 0.8, // Slightly lighter for better control
        restitution: 0.85, // More bounce
        friction: 0.6, // More friction for better interaction
        collisionFlags: 0, // DYNAMIC object
        angularDamping: 0.5, // More angular damping for stability
        linearDamping: 0.3, // Less linear damping for better movement
      },
      {
        standard: {
          color,
          roughness: 0.9,
          metalness: 0.1,
        },
      },
    );

    // Set basic physics properties
    ball.body.setBounciness(0.85);
    ball.body.setFriction(0.6);
    ball.needUpdate = true;

    // Enable shadows
    ball.castShadow = true;
    ball.receiveShadow = false;

    // Store references
    this.mesh = ball;
    this.body = ball.body;

    // Add textures to make it look like a basketball
    this.addTexture();

    return this;
  }

  addTexture() {
    // Add basketball stripes/lines using a group of thin torus shapes
    const stripeGroup = new THREE.Group();
    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.95,
      metalness: 0,
      emissive: 0x000000,
    });

    const { radius } = this.config;

    // Create the classic basketball seam pattern with 4 curved lines
    // forming a symmetrical pattern around the ball

    // Create 4 curved seams rotated around the Y axis
    for (let i = 0; i < 4; i++) {
      const curve = this.createCurvedSeam(
        radius,
        (i * Math.PI) / 2,
        stripeMaterial,
      );
      stripeGroup.add(curve);
    }

    // Add subtle bumps texture to the main ball surface
    if (this.mesh.material) {
      this.mesh.material.roughness = 0.85;
      this.mesh.material.metalness = 0.05;
    }

    // Add the stripe group to the basketball
    this.mesh.add(stripeGroup);
  }

  createCurvedSeam(radius, yRotation, material) {
    // Create a curved seam using flat boxes that sit flush on the surface
    const group = new THREE.Group();
    const segments = 64;
    const seamWidth = radius * 0.035;
    const seamHeight = radius * 0.005; // Very thin height

    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1);
      // Create a sine wave curve from -90° to +90°
      const phi = (t - 0.5) * Math.PI; // -90° to +90°
      const theta = Math.sin(phi * 1.5) * (Math.PI / 3); // Curved path

      // Calculate position on sphere surface (flush with surface)
      const x = Math.sin(theta) * Math.cos(phi) * radius;
      const y = Math.sin(phi) * radius;
      const z = Math.cos(theta) * Math.cos(phi) * radius;

      // Create small flat segment
      const segment = new THREE.Mesh(
        new THREE.BoxGeometry(seamWidth, seamHeight, radius * 0.08),
        material,
      );

      segment.position.set(x, y, z);

      // Orient segment to follow the curve and sit on surface
      const normal = new THREE.Vector3(x, y, z).normalize();
      segment.lookAt(
        segment.position.x + normal.x,
        segment.position.y + normal.y,
        segment.position.z + normal.z,
      );

      group.add(segment);
    }

    group.rotation.y = yRotation;
    return group;
  }

  /**
   * Apply force to the basketball in a direction
   * @param {THREE.Vector3} force The force vector to apply
   */
  applyForce(force) {
    if (this.body) {
      // Apply central impulse to the basketball
      this.body.applyForce(force.x, force.y, force.z);

      // Mark that the ball has been shot
      this.isReset = false;
    }
  }

  /**
   * Reset the basketball to the starting position
   */
  reset(position = null) {
    if (this.body && this.mesh) {
      // If position is provided, use it, otherwise use the default
      const resetPos = position || this.config.position;

      try {
        // Remove the existing basketball from the scene and physics world
        this.physics.destroy(this.mesh);
        this.scene.remove(this.mesh);

        // Update the position in config
        this.config.position = resetPos;

        // Create a new basketball
        this.create();

        // Mark the ball as reset
        this.isReset = true;
      } catch (error) {
        console.error("Error resetting basketball:", error);
      }
    }
  }

  /**
   * Update the basketball
   */
  update() {
    // Any per-frame updates for the basketball
    // This could include checking if it's out of bounds, etc.
  }

  /**
   * Returns the current position of the basketball
   */
  getPosition() {
    if (this.mesh) {
      return this.mesh.position.clone();
    }
    return new THREE.Vector3();
  }

  /**
   * Returns the current velocity of the basketball
   */
  getVelocity() {
    if (this.body) {
      const velocity = this.body.velocity;
      return new THREE.Vector3(velocity.x, velocity.y, velocity.z);
    }
    return new THREE.Vector3();
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Clean up resources associated with the basketball
    if (this.mesh) {
      if (this.mesh.material) {
        this.mesh.material.dispose();
      }
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
    }
  }
}

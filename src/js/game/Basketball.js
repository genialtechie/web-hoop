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
      restitution: options.restitution || 0.8, // High bounce
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
    const { radius, mass, position, restitution, friction, color } =
      this.config;

    // Create the ball with physics
    const ball = this.physics.add.sphere(
      {
        radius,
        x: position.x,
        y: position.y,
        z: position.z,
        mass,
        restitution,
        friction,
      },
      {
        phong: {
          color,
          shininess: 10,
          specular: 0x111111,
        },
      },
    );

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
    // This could be enhanced with a proper basketball texture
    // For now, we'll create a simple pattern to represent the basketball
    // Commented out to avoid linter errors - would be used in a full implementation
    // const geometry = new THREE.SphereGeometry(this.config.radius, 32, 32);
    // const textureLoader = new THREE.TextureLoader();
    // Load a basketball texture (this would be a placeholder until you have a real texture)
    // For now, we'll keep using the material from physics factory
    // Note: In a real implementation, you would load a texture file
    // Example of how you would add the texture if you had one:
    // textureLoader.load('/path/to/basketball-texture.jpg', (texture) => {
    //   this.mesh.material = new THREE.MeshStandardMaterial({
    //     map: texture,
    //     color: this.config.color,
    //     roughness: 0.8,
    //     metalness: 0.1
    //   });
    // });
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
    if (this.body) {
      // If position is provided, use it, otherwise use the default
      const resetPos = position || this.config.position;

      // Reset the position
      this.body.position.set(resetPos.x, resetPos.y, resetPos.z);

      // Reset the velocity and angular velocity
      this.body.setVelocity(0, 0, 0);
      this.body.setAngularVelocity(0, 0, 0);

      // Mark the ball as reset
      this.isReset = true;
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

import * as THREE from "three";

export class InputManager {
  constructor(options) {
    this.options = options || {};
    this.element = this.options.element || document;
    this.camera = this.options.camera;
    this.strength = this.options.strength || 10;
    this.showTrajectory = this.options.showTrajectory || false;
    this.onSwipe = this.options.onSwipe || function () {};

    // Swipe handling properties
    this.startPoint = new THREE.Vector2();
    this.endPoint = new THREE.Vector2();
    this.isSwiping = false;
    this.minSwipeDistance = 20; // Minimum distance (in pixels) to register as a swipe

    // Trajectory line for shot preview
    this.trajectoryLine = null;
    this.trajectoryPoints = 20; // Number of points in the trajectory line

    if (this.showTrajectory) {
      this.createTrajectoryLine();
    }

    // Bind methods
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);

    // Add event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Touch events for mobile
    this.element.addEventListener("touchstart", this.handleTouchStart, false);
    this.element.addEventListener("touchmove", this.handleTouchMove, false);
    this.element.addEventListener("touchend", this.handleTouchEnd, false);

    // Mouse events for desktop
    this.element.addEventListener("mousedown", this.handleMouseDown, false);
    this.element.addEventListener("mousemove", this.handleMouseMove, false);
    this.element.addEventListener("mouseup", this.handleMouseUp, false);
  }

  handleTouchStart(event) {
    event.preventDefault();
    if (event.touches.length === 1) {
      this.startPoint.set(event.touches[0].clientX, event.touches[0].clientY);
      this.isSwiping = true;
    }
  }

  handleTouchMove(event) {
    if (!this.isSwiping) return;

    if (event.touches.length === 1) {
      this.endPoint.set(event.touches[0].clientX, event.touches[0].clientY);

      // Calculate direction and force for preview
      const force = this.calculateForce(this.startPoint, this.endPoint);

      // Call onSwipe with preview flag
      if (this.onSwipe) {
        this.onSwipe(force, true);
      }
    }
  }

  handleTouchEnd() {
    if (!this.isSwiping) return;

    this.isSwiping = false;

    // Calculate direction and force for the shot
    const force = this.calculateForce(this.startPoint, this.endPoint);

    // Calculate distance to check if it's a valid swipe
    const distance = this.startPoint.distanceTo(this.endPoint);

    if (distance > this.minSwipeDistance && this.onSwipe) {
      this.onSwipe(force, false);
    }
  }

  handleMouseDown(event) {
    this.startPoint.set(event.clientX, event.clientY);
    this.isSwiping = true;
  }

  handleMouseMove(event) {
    if (!this.isSwiping) return;

    this.endPoint.set(event.clientX, event.clientY);

    // Calculate direction and force for preview
    const force = this.calculateForce(this.startPoint, this.endPoint);

    // Call onSwipe with preview flag
    if (this.onSwipe) {
      this.onSwipe(force, true);
    }
  }

  handleMouseUp(event) {
    if (!this.isSwiping) return;

    this.isSwiping = false;
    this.endPoint.set(event.clientX, event.clientY);

    // Calculate direction and force for the shot
    const force = this.calculateForce(this.startPoint, this.endPoint);

    // Calculate distance to check if it's a valid swipe
    const distance = this.startPoint.distanceTo(this.endPoint);

    if (distance > this.minSwipeDistance && this.onSwipe) {
      this.onSwipe(force, false);
    }
  }

  calculateForce(start, end) {
    // Calculate direction vector
    const direction = new THREE.Vector3(
      (start.x - end.x) * 0.01, // X force (left/right)
      (start.y - end.y) * 0.01, // Y force (up/down)
      -1, // Always shoot away from the player (towards -Z)
    );

    // Scale by strength
    direction.multiplyScalar(this.strength);

    // Ensure reasonable limits
    direction.x = THREE.MathUtils.clamp(
      direction.x,
      -this.strength,
      this.strength,
    );
    direction.y = THREE.MathUtils.clamp(direction.y, 0, this.strength * 2); // More upward force allowed
    direction.z = THREE.MathUtils.clamp(direction.z, -this.strength * 2, 0);

    return direction;
  }

  createTrajectoryLine() {
    // Create a curved line to show the trajectory
    const material = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.1,
      gapSize: 0.1,
      opacity: 0.7,
      transparent: true,
    });

    // Create geometry with empty points (will be updated during swipe)
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.trajectoryPoints * 3); // 3 values per point (x, y, z)
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Create the line
    this.trajectoryLine = new THREE.Line(geometry, material);
    this.trajectoryLine.computeLineDistances(); // Required for dashed line
    this.trajectoryLine.visible = false;
  }

  updateTrajectoryLine(startPosition, force) {
    if (!this.trajectoryLine) return;

    // Make trajectory visible
    this.trajectoryLine.visible = true;

    // Calculate points along the trajectory
    const positions = [];
    const gravity = new THREE.Vector3(0, -9.8, 0); // Gravity vector
    const velocity = force.clone(); // Initial velocity
    const position = new THREE.Vector3(
      startPosition.x,
      startPosition.y,
      startPosition.z,
    );

    // Time step for simulation
    const timeStep = 0.1;

    // Simulate trajectory points
    for (let i = 0; i < this.trajectoryPoints; i++) {
      // Add point to positions array
      positions.push(position.x, position.y, position.z);

      // Update position using physics (simplified)
      position.x += velocity.x * timeStep;
      position.y += velocity.y * timeStep;
      position.z += velocity.z * timeStep;

      // Update velocity with gravity
      velocity.x += gravity.x * timeStep;
      velocity.y += gravity.y * timeStep;
      velocity.z += gravity.z * timeStep;

      // Stop if trajectory goes below ground
      if (position.y < 0) break;
    }

    // Fill remaining points if any
    while (positions.length < this.trajectoryPoints * 3) {
      positions.push(0, 0, 0);
    }

    // Update trajectory line geometry
    const positionAttribute =
      this.trajectoryLine.geometry.getAttribute("position");
    for (let i = 0; i < positions.length; i++) {
      positionAttribute.array[i] = positions[i];
    }
    positionAttribute.needsUpdate = true;

    // Update line distances for proper dashing
    this.trajectoryLine.computeLineDistances();
  }

  hideTrajectoryLine() {
    if (this.trajectoryLine) {
      this.trajectoryLine.visible = false;
    }
  }

  getTrajectoryLine() {
    return this.trajectoryLine;
  }

  dispose() {
    // Remove event listeners
    this.element.removeEventListener("touchstart", this.handleTouchStart);
    this.element.removeEventListener("touchmove", this.handleTouchMove);
    this.element.removeEventListener("touchend", this.handleTouchEnd);
    this.element.removeEventListener("mousedown", this.handleMouseDown);
    this.element.removeEventListener("mousemove", this.handleMouseMove);
    this.element.removeEventListener("mouseup", this.handleMouseUp);

    // Dispose trajectory line if it exists
    if (this.trajectoryLine) {
      this.trajectoryLine.geometry.dispose();
      this.trajectoryLine.material.dispose();
      this.trajectoryLine = null;
    }
  }
}

import * as THREE from "three";

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.trails = [];
  }

  // Create particle explosion effect
  createScoreExplosion(position, color = 0xffd700) {
    const particleCount = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    const colors = [];

    for (let i = 0; i < particleCount; i++) {
      // Random position around the hoop
      positions.push(
        position.x + (Math.random() - 0.5) * 0.3,
        position.y + (Math.random() - 0.5) * 0.3,
        position.z + (Math.random() - 0.5) * 0.3,
      );

      // Random velocities
      velocities.push(
        (Math.random() - 0.5) * 0.15,
        Math.random() * 0.2,
        (Math.random() - 0.5) * 0.15,
      );

      // Color variation
      const c = new THREE.Color(color);
      c.offsetHSL(Math.random() * 0.1 - 0.05, 0, Math.random() * 0.2 - 0.1);
      colors.push(c.r, c.g, c.b);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    // Animate particles
    const particleData = {
      mesh: particles,
      velocities: velocities,
      life: 1.0,
      maxLife: 1.0,
    };

    this.particles.push(particleData);

    // Clean up after animation
    setTimeout(() => {
      this.scene.remove(particles);
      geometry.dispose();
      material.dispose();
      this.particles = this.particles.filter((p) => p.mesh !== particles);
    }, 1500);
  }

  // Create confetti for streaks
  createConfetti(position, streak) {
    const particleCount = Math.min(18 + streak * 6, 64);
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    const colors = [];

    const confettiColors = [0xffd24a, 0xff5a2a, 0xffffff, 0x2ee6d6, 0xff2f6d];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.45;
      const radius = Math.random() * 0.16;

      positions.push(
        position.x + Math.cos(angle) * radius,
        position.y + (Math.random() - 0.2) * 0.08,
        position.z + Math.sin(angle) * radius,
      );

      velocities.push(
        Math.cos(angle) * (0.055 + Math.random() * 0.09),
        0.08 + Math.random() * 0.15,
        Math.sin(angle) * (0.055 + Math.random() * 0.09),
      );

      const color = new THREE.Color(
        confettiColors[Math.floor(Math.random() * confettiColors.length)],
      );
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    const particleData = {
      mesh: particles,
      velocities: velocities,
      life: 1.0,
      maxLife: 1.0,
    };

    this.particles.push(particleData);

    setTimeout(() => {
      this.scene.remove(particles);
      geometry.dispose();
      material.dispose();
      this.particles = this.particles.filter((p) => p.mesh !== particles);
    }, 1300);
  }

  // Create ball trail effect
  createBallTrail(ballMesh) {
    if (!ballMesh) return;

    const trail = {
      positions: [],
      maxLength: 15,
      line: null,
    };

    // Create line geometry
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      color: 0xffa500,
      transparent: true,
      opacity: 0.6,
      linewidth: 2,
    });

    trail.line = new THREE.Line(geometry, material);
    this.scene.add(trail.line);
    this.trails.push(trail);

    return trail;
  }

  // Update ball trail
  updateBallTrail(trail, position) {
    if (!trail || !trail.line) return;

    trail.positions.push(position.clone());

    // Keep only recent positions
    if (trail.positions.length > trail.maxLength) {
      trail.positions.shift();
    }

    // Update line geometry
    const positions = [];
    trail.positions.forEach((pos) => {
      positions.push(pos.x, pos.y, pos.z);
    });

    trail.line.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    trail.line.geometry.attributes.position.needsUpdate = true;
  }

  // Clear ball trail
  clearBallTrail(trail) {
    if (!trail || !trail.line) return;

    this.scene.remove(trail.line);
    trail.line.geometry.dispose();
    trail.line.material.dispose();
    this.trails = this.trails.filter((t) => t !== trail);
  }

  // Create glow effect around hoop for combos
  createHoopGlow(hoopPosition, streak) {
    const glowColor = streak >= 5 ? 0xff00ff : 0xffd700;

    const glowGeometry = new THREE.TorusGeometry(0.46, 0.05, 8, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(hoopPosition);
    glow.rotation.x = Math.PI / 2;
    this.scene.add(glow);

    // Animate glow
    let time = 0;
    const animate = () => {
      time += 0.05;
      glow.scale.setScalar(1 + Math.sin(time * 4) * 0.1);
      glow.material.opacity = 0.4 + Math.sin(time * 3) * 0.2;

      if (time < 2) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(glow);
        glowGeometry.dispose();
        glowMaterial.dispose();
      }
    };
    animate();
  }

  // Screen shake effect (returns shake offset)
  getScreenShake(intensity = 1, duration = 300) {
    let startTime = Date.now();

    const shake = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) return { x: 0, y: 0, z: 0 };

      const progress = elapsed / duration;
      const amplitude = intensity * (1 - progress) * 0.05;

      return {
        x: (Math.random() - 0.5) * amplitude,
        y: (Math.random() - 0.5) * amplitude,
        z: (Math.random() - 0.5) * amplitude,
      };
    };

    return shake;
  }

  // Update all particle systems
  update(delta) {
    const gravity = -0.008;

    this.particles.forEach((particleData) => {
      const positions = particleData.mesh.geometry.attributes.position.array;

      // Update each particle
      for (let i = 0; i < positions.length; i += 3) {
        const index = i / 3;

        // Apply velocity
        positions[i] += particleData.velocities[index * 3];
        positions[i + 1] += particleData.velocities[index * 3 + 1];
        positions[i + 2] += particleData.velocities[index * 3 + 2];

        // Apply gravity
        particleData.velocities[index * 3 + 1] += gravity;
      }

      particleData.mesh.geometry.attributes.position.needsUpdate = true;

      // Fade out
      particleData.life -= delta * 0.001;
      particleData.mesh.material.opacity = particleData.life;
    });
  }

  // Clean up all effects
  dispose() {
    this.particles.forEach((particleData) => {
      this.scene.remove(particleData.mesh);
      particleData.mesh.geometry.dispose();
      particleData.mesh.material.dispose();
    });

    this.trails.forEach((trail) => {
      if (trail.line) {
        this.scene.remove(trail.line);
        trail.line.geometry.dispose();
        trail.line.material.dispose();
      }
    });

    this.particles = [];
    this.trails = [];
  }
}

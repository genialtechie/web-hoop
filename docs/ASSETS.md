# Game Assets

This document outlines the required assets for the 3D Basketball Swipe Game.

## 3D Models

### Basketball

Low-poly sphere with basketball texture
Approximately 500-1000 polygons
Physical properties:

- Radius: 12 cm
- Mass: 0.6 kg
- Restitution (bounciness): 0.8

### Hoop

- Consists of rim, net, and mounting bracket
- Rim: Metal ring with proper collision physics
- Net: Can be implemented as a static mesh or soft body simulation
- Physical properties:
  - Rim diameter: 45 cm
  - Rim height: 3.05 m from ground
  - Rim distance from backboard: 15 cm

### Backboard

- Rectangular board with transparent section
- Physical properties:
  - Width: 1.8 m
  - Height: 1.05 m
  - Thickness: 5 cm
  - Restitution: 0.4 (less bouncy than ball)

### Environment

Simple court floor or outdoor background

## Textures

All textures should be power-of-two dimensions (e.g., 512×512, 1024×1024, 2048×2048).

### Required Texture Maps

- Color/Albedo Maps: Base color information
- Normal Maps: Surface detail
- Roughness Maps: How rough or smooth the surface appears
- Metallic Maps: For metallic parts like the rim

### Texture Optimization

- Use compressed formats (KTX2, ASTC, etc.) for production
- Provide fallbacks for browsers without compression support
- Mipmap all textures for better performance at different distances

## Audio Assets

### Sound Effects

- Ball bouncing on different surfaces
- Swish sound for successful basket
- Rim hit sound
- Backboard hit sound
- Game start/end sounds

### Background Music

- Optional ambient soundtrack
- Menu music

### Audio Format

- Primary: MP3 (good compatibility)
- Alternative: WebM (better quality/size ratio for modern browsers)
- All sound effects should be short, mono, 44.1kHz

## UI Assets

### Textures and Icons

- Score display
- Menu buttons
- Tutorial graphics
- Power meter
- Achievement icons

### Font

- Primary game font (sans-serif recommended for readability)
- Secondary accent font

## Placeholder Assets

During development, the following placeholder assets can be used:

- Ball: Sphere geometry with basic material
- Hoop: Torus geometry for rim, cylindrical geometry for post
- Backboard: Box geometry
- Environment: Simple plane with color

## Asset Loading Strategy

### Progressive Loading:

- Load essential assets first (ball, basic environment)
- Load higher quality assets and secondary elements afterward

### Asset Management:

- Use a loading manager to track progress
- Implement a caching strategy for frequently used assets
- Consider using a CDN for production assets

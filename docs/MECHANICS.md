# Game Mechanics

This document details the gameplay mechanics for the 3D Basketball Swipe Game.

## Core Gameplay Loop

- Player is presented with a basketball at the bottom of the screen
- Player touches and swipes upward on the ball
- Ball launches in the direction and with power based on the swipe
- Ball interacts with the environment (air resistance, gravity, collisions)
- If the ball goes through the hoop, player scores a point
- Ball is reset for the next shot

## Shooting Mechanics

### Swipe Detection

The game detects a swipe with the following parameters:

- Start Position: Where the player first touches the screen
- End Position: Where the player releases their touch
- Swipe Vector: Direction and magnitude of the swipe
- Swipe Duration: Time between touch start and release

### Physics Calculation

The ball's launch is determined by:

- Velocity: Calculated from the swipe length and duration
  `velocityMagnitude = swipeLength * powerFactor / swipeDuration`
- Direction: Primarily upward with horizontal component based on swipe angle
  `   angle = Math.atan2(swipeEndY - swipeStartY, swipeEndX - swipeStartX)`
- Spin: Optional rotation effect based on the swipe angle
  `   spinFactor = (swipeEndX - swipeStartX) * 0.05`

### Ball Physics Properties

- Mass: Affects how the ball responds to forces
- Restitution: How bouncy the ball is (basketball is around 0.75-0.85)
- Friction: Affects how the ball interacts with surfaces
- Air Resistance: Slows the ball over time

## Scoring System

### Basic Scoring

- +1 point for each successful basket

### Score Detection

Scoring is detected when:

1. The ball passes through the hoop's trigger volume
2. The ball is moving downward (preventing scoring from underneath)
3. The ball's center passes through the hoop's plane

## Player Feedback

### Visual Feedback

- Ball trajectory shown during flight
- Hoop and net react physically to the ball
- Score counter updates with animation
- Camera shake or flash effect on successful shot

### Audio Feedback

- Swish sound when ball goes through the net
- Bounce sounds when ball hits surfaces
- Background ambient sounds

## Controls

### Mobile

- Touch and swipe up on the ball to shoot
- Swipe direction and strength determine shot angle and power

### Desktop

- Click and drag upward on the ball to shoot
- Optional arrow key controls for precise aiming

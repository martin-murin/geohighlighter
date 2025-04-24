// Simplification configuration
// This file contains settings for geometry simplification

const simplificationConfig = {
  // Default multiplier for all tolerance values (higher = more simplification)
  // 1.0 = default values, 0.5 = half the simplification (more precise), 2.0 = twice the simplification (more aggressive)
  globalMultiplier: 1.0,
  
  // Base tolerance values for different feature sizes
  baseTolerances: {
    veryLarge: 0.02, // Very large (countries)
    large: 0.01,     // Large (regions)
    medium: 0.005,   // Medium (counties/districts)
    small: 0.002     // Small (cities/towns)
  },
  
  // Threshold values for feature area classification
  thresholds: {
    veryLarge: 100,  // Area > 100 square degrees
    large: 10,       // Area > 10 square degrees
    medium: 1        // Area > 1 square degree
  },
  
  // Whether to use adaptive simplification based on area size
  useAdaptive: true,
  
  // Whether to round coordinates to save additional space (5 decimals ≈ 1.1m precision)
  roundCoordinates: true,
  
  // Decimal places for coordinate rounding (5 is usually sufficient, ~1.1m precision)
  roundingDecimals: 5
};

// Calculate actual tolerance based on feature area and configuration
export const calculateTolerance = (area) => {
  if (!simplificationConfig.useAdaptive) {
    // If adaptive simplification is disabled, use a fixed tolerance
    return simplificationConfig.baseTolerances.medium * simplificationConfig.globalMultiplier;
  }
  
  // Determine base tolerance based on area thresholds
  let baseTolerance;
  if (area > simplificationConfig.thresholds.veryLarge) {
    baseTolerance = simplificationConfig.baseTolerances.veryLarge;
  } else if (area > simplificationConfig.thresholds.large) {
    baseTolerance = simplificationConfig.baseTolerances.large;
  } else if (area > simplificationConfig.thresholds.medium) {
    baseTolerance = simplificationConfig.baseTolerances.medium;
  } else {
    baseTolerance = simplificationConfig.baseTolerances.small;
  }
  
  // Apply global multiplier
  return baseTolerance * simplificationConfig.globalMultiplier;
};

// Helper function to round coordinates if enabled
export const maybeRoundCoordinates = (geometry, decimals = simplificationConfig.roundingDecimals) => {
  if (!simplificationConfig.roundCoordinates) return geometry;
  
  if (!geometry || !geometry.coordinates) return geometry;
  
  const round = (coords) => {
    if (Array.isArray(coords[0])) {
      return coords.map(c => round(c));
    } else {
      return coords.map(c => Number(c.toFixed(decimals)));
    }
  };
  
  return {
    ...geometry,
    coordinates: round(geometry.coordinates)
  };
};

export default simplificationConfig;

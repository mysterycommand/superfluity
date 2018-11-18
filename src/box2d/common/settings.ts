// tslint:disable variable-name

export const VERSION = '2.1alpha';
export const USHRT_MAX = 0x0000ffff;
export const b2_pi = Math.PI;
export const b2_maxManifoldPoints = 2;
export const b2_aabbExtension = 0.1;
export const b2_aabbMultiplier = 2.0;
export const b2_linearSlop = 0.005;
export const b2_polygonRadius = 2.0 * b2_linearSlop;
export const b2_angularSlop = (2.0 / 180.0) * b2_pi;
export const b2_toiSlop = 8.0 * b2_linearSlop;
export const b2_maxTOIContactsPerIsland = 32;
export const b2_maxTOIJointsPerIsland = 32;
export const b2_velocityThreshold = 1.0;
export const b2_maxLinearCorrection = 0.2;
export const b2_maxAngularCorrection = (8.0 / 180.0) * b2_pi;
export const b2_maxTranslation = 2.0;
export const b2_maxTranslationSquared = b2_maxTranslation * b2_maxTranslation;
export const b2_maxRotation = 0.5 * b2_pi;
export const b2_maxRotationSquared = b2_maxRotation * b2_maxRotation;
export const b2_contactBaumgarte = 0.2;
export const b2_timeToSleep = 0.5;
export const b2_linearSleepTolerance = 0.01;
export const b2_angularSleepTolerance = (2.0 / 180.0) * b2_pi;

export function b2MixFriction(friction1 = 0, friction2 = 0) {
  return Math.sqrt(friction1 * friction2);
}

export function b2MixRestitution(restitution1 = 0, restitution2 = 0) {
  return restitution1 > restitution2 ? restitution1 : restitution2;
}

export function b2Assert(a: boolean) {
  if (!a) {
    throw new Error('Assertion failed!');
  }
}

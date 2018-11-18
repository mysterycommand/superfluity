// tslint:disable variable-name

import SimplexCache from './simplex-cache';
import { Distance } from './distance';
import DistanceInput from './distance-input';
import DistanceOutput from './distance-output';
import { Abs, Max } from '../common/math';
import Transform from '../common/math/transform';
import { b2Assert } from '../common/settings';
import SeparationFunction from './separation-function';
import ToiInput from './toi-input';

export let b2_toiCalls = 0;
export let b2_toiIters = 0;
export let b2_toiMaxIters = 0;
export let b2_toiRootIters = 0;
export let b2_toiMaxRootIters = 0;

export const s_cache = new SimplexCache();
export const s_distanceInput = new DistanceInput();
export const s_xfA = new Transform();
export const s_xfB = new Transform();
export const s_fcn = new SeparationFunction();
export const s_distanceOutput = new DistanceOutput();

export function TimeOfImpact(input: ToiInput) {
  ++b2_toiCalls;
  const proxyA = input.proxyA;
  const proxyB = input.proxyB;

  const sweepA = input.sweepA;
  const sweepB = input.sweepB;

  b2Assert(sweepA.t0 === sweepB.t0);
  b2Assert(1 - sweepA.t0 > Number.MIN_VALUE);

  const radius = proxyA.m_radius + proxyB.m_radius;
  const tolerance = input.tolerance;

  let alpha = 0;
  const k_maxIterations = 1000;

  let iter = 0;
  let target = 0;

  s_cache.count = 0;
  s_distanceInput.useRadii = false;

  for (;;) {
    sweepA.GetTransform(s_xfA, alpha);
    sweepB.GetTransform(s_xfB, alpha);

    s_distanceInput.proxyA = proxyA;
    s_distanceInput.proxyB = proxyB;

    s_distanceInput.transformA = s_xfA;
    s_distanceInput.transformB = s_xfB;

    Distance(s_distanceOutput, s_cache, s_distanceInput);

    if (s_distanceOutput.distance <= 0) {
      alpha = 1;
      break;
    }

    s_fcn.Initialize(s_cache, proxyA, s_xfA, proxyB, s_xfB);
    const separation = s_fcn.Evaluate(s_xfA, s_xfB);

    if (separation <= 0) {
      alpha = 1;
      break;
    }

    if (iter === 0) {
      if (separation > radius) {
        target = Max(radius - tolerance, 0.75 * radius);
      } else {
        target = Max(separation - tolerance, 0.02 * radius);
      }
    }

    if (separation - target < 0.5 * tolerance) {
      if (iter === 0) {
        alpha = 1.0;
        break;
      }

      break;
    }

    let newAlpha = alpha;
    {
      let x1 = alpha;
      let x2 = 1.0;

      let f1 = separation;

      sweepA.GetTransform(s_xfA, x2);
      sweepB.GetTransform(s_xfB, x2);

      let f2 = s_fcn.Evaluate(s_xfA, s_xfB);

      if (f2 >= target) {
        alpha = 1.0;
        break;
      }

      let rootIterCount = 0;

      for (;;) {
        let x = 0;

        if (rootIterCount & 1) {
          x = x1 + ((target - f1) * (x2 - x1)) / (f2 - f1);
        } else {
          x = 0.5 * (x1 + x2);
        }

        sweepA.GetTransform(s_xfA, x);
        sweepB.GetTransform(s_xfB, x);

        const f = s_fcn.Evaluate(s_xfA, s_xfB);

        if (Abs(f - target) < 0.025 * tolerance) {
          newAlpha = x;
          break;
        }

        if (f > target) {
          x1 = x;
          f1 = f;
        } else {
          x2 = x;
          f2 = f;
        }

        ++rootIterCount;
        ++b2_toiRootIters;

        if (rootIterCount === 50) {
          break;
        }
      }

      b2_toiMaxRootIters = Max(b2_toiMaxRootIters, rootIterCount);
    }

    if (newAlpha < (1.0 + 100.0 * Number.MIN_VALUE) * alpha) {
      break;
    }

    alpha = newAlpha;
    iter++;

    ++b2_toiIters;
    if (iter === k_maxIterations) {
      break;
    }
  }

  b2_toiMaxIters = Max(b2_toiMaxIters, iter);
  return alpha;
}

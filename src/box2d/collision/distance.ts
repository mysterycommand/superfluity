// tslint:disable variable-name

import * as Settings from '../common/settings';
import { Max, MulTMV, MulX, SubtractVV } from '../common/math';
import Vec2 from '../common/math/vec2';

import DistanceInput from './distance-input';
import DistanceOutput from './distance-output';
import Simplex from './simplex';
import SimplexCache from './simplex-cache';

export const s_simplex = new Simplex();
export const s_saveA = new Array(3).fill(0);
export const s_saveB = new Array(3).fill(0);

export let b2_gjkCalls = 0;
export let b2_gjkIters = 0;
export let b2_gjkMaxIters = 0;

export function Distance(
  output: DistanceOutput,
  cache: SimplexCache,
  input: DistanceInput,
) {
  ++b2_gjkCalls;

  const proxyA = input.proxyA;
  const proxyB = input.proxyB;

  const transformA = input.transformA;
  const transformB = input.transformB;

  const simplex = s_simplex;
  simplex.ReadCache(cache, proxyA, transformA, proxyB, transformB);

  const vertices = simplex.m_vertices;
  const k_maxIters = 20;

  const saveA = s_saveA;
  const saveB = s_saveB;
  let saveCount = 0;

  const closestPoint = simplex.GetClosestPoint();
  let distanceSqr1 = closestPoint.LengthSquared();
  let distanceSqr2 = distanceSqr1;

  let p;
  let iter = 0;
  while (iter < k_maxIters) {
    saveCount = simplex.m_count;
    for (let i = 0; i < saveCount; i++) {
      saveA[i] = vertices[i].indexA;
      saveB[i] = vertices[i].indexB;
    }

    switch (simplex.m_count) {
      case 1:
        break;
      case 2:
        simplex.Solve2();
        break;
      case 3:
        simplex.Solve3();
        break;
      default:
        Settings.b2Assert(false);
    }

    if (simplex.m_count === 3) {
      break;
    }

    p = simplex.GetClosestPoint();
    distanceSqr2 = p.LengthSquared();
    // if (distanceSqr2 > distanceSqr1) {}

    distanceSqr1 = distanceSqr2;
    const d = simplex.GetSearchDirection();
    if (d.LengthSquared() < Number.MIN_VALUE * Number.MIN_VALUE) {
      break;
    }

    const vertex = vertices[simplex.m_count];
    vertex.indexA = proxyA.GetSupport(MulTMV(transformA.R, d.GetNegative()));
    vertex.wA = MulX(transformA, proxyA.GetVertex(vertex.indexA));
    vertex.indexB = proxyB.GetSupport(MulTMV(transformB.R, d));
    vertex.wB = MulX(transformB, proxyB.GetVertex(vertex.indexB));
    vertex.w = SubtractVV(vertex.wB, vertex.wA);

    ++iter;
    ++b2_gjkIters;

    let duplicate = false;
    for (let i = 0; i < saveCount; i++) {
      if (vertex.indexA === saveA[i] && vertex.indexB === saveB[i]) {
        duplicate = true;
        break;
      }
    }

    if (duplicate) {
      break;
    }

    ++simplex.m_count;
  }

  b2_gjkMaxIters = Max(b2_gjkMaxIters, iter);

  simplex.GetWitnessPoints(output.pointA, output.pointB);
  output.distance = SubtractVV(output.pointA, output.pointB).Length();
  output.iterations = iter;
  simplex.WriteCache(cache);

  if (input.useRadii) {
    const rA = proxyA.m_radius;
    const rB = proxyB.m_radius;

    if (output.distance > rA + rB && output.distance > Number.MIN_VALUE) {
      output.distance -= rA + rB;
      const normal = SubtractVV(output.pointB, output.pointA);
      normal.Normalize();
      output.pointA.x += rA * normal.x;
      output.pointA.y += rA * normal.y;
      output.pointB.x -= rB * normal.x;
      output.pointB.y -= rB * normal.y;
    } else {
      p = new Vec2();
      p.x = 0.5 * (output.pointA.x + output.pointB.x);
      p.y = 0.5 * (output.pointA.y + output.pointB.y);
      output.pointA.x = output.pointB.x = p.x;
      output.pointA.y = output.pointB.y = p.y;
      output.distance = 0.0;
    }
  }
}

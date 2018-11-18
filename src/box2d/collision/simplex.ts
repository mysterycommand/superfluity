// tslint:disable variable-name

import * as Settings from '../common/settings';
import {
  CrossFV,
  CrossVF,
  CrossVV,
  Dot,
  MulX,
  parseUInt,
  SubtractVV,
} from '../common/math';
import DistanceProxy from './distance-proxy';
import SimplexCache from './simplex-cache';
import SimplexVertex from './simplex-vertex';
import Transform from '../common/math/transform';
import Vec2 from '../common/math/vec2';

export default class Simplex {
  public m_v1 = new SimplexVertex();
  public m_v2 = new SimplexVertex();
  public m_v3 = new SimplexVertex();
  public m_vertices: SimplexVertex[] = new Array(3);
  public m_count = 0;

  constructor() {
    this.m_vertices[0] = this.m_v1;
    this.m_vertices[1] = this.m_v2;
    this.m_vertices[2] = this.m_v3;
  }

  public ReadCache(
    cache: SimplexCache,
    proxyA: DistanceProxy,
    transformA: Transform,
    proxyB: DistanceProxy,
    transformB: Transform,
  ) {
    Settings.b2Assert(0 <= cache.count && cache.count <= 3);

    let wALocal;
    let wBLocal;

    this.m_count = cache.count;
    const vertices = this.m_vertices;

    let v;
    for (let i = 0; i < this.m_count; i++) {
      v = vertices[i];
      v.indexA = cache.indexA[i];
      v.indexB = cache.indexB[i];

      wALocal = proxyA.GetVertex(v.indexA);
      wBLocal = proxyB.GetVertex(v.indexB);

      v.wA = MulX(transformA, wALocal);
      v.wB = MulX(transformB, wBLocal);
      v.w = SubtractVV(v.wB, v.wA);
      v.a = 0;
    }

    if (this.m_count > 1) {
      const metric1 = cache.metric;
      const metric2 = this.GetMetric();

      if (
        metric2 < 0.5 * metric1 ||
        2.0 * metric1 < metric2 ||
        metric2 < Number.MIN_VALUE
      ) {
        this.m_count = 0;
      }
    }

    if (this.m_count === 0) {
      v = vertices[0];
      v.indexA = 0;
      v.indexB = 0;

      wALocal = proxyA.GetVertex(0);
      wBLocal = proxyB.GetVertex(0);

      v.wA = MulX(transformA, wALocal);
      v.wB = MulX(transformB, wBLocal);
      v.w = SubtractVV(v.wB, v.wA);

      this.m_count = 1;
    }
  }

  public WriteCache(cache: SimplexCache) {
    cache.metric = this.GetMetric();
    cache.count = parseUInt(this.m_count);
    const vertices = this.m_vertices;

    for (let i = 0; i < this.m_count; i++) {
      cache.indexA[i] = parseUInt(vertices[i].indexA);
      cache.indexB[i] = parseUInt(vertices[i].indexB);
    }
  }

  public GetSearchDirection() {
    switch (this.m_count) {
      case 1:
        return this.m_v1.w.GetNegative();

      case 2: {
        const e12 = SubtractVV(this.m_v2.w, this.m_v1.w);
        const sgn = CrossVV(e12, this.m_v1.w.GetNegative());

        return sgn > 0.0 ? CrossFV(1, e12) : CrossVF(e12, 1);
      }

      default:
        Settings.b2Assert(false);
        return new Vec2();
    }
  }

  public GetClosestPoint() {
    switch (this.m_count) {
      case 0:
        Settings.b2Assert(false);
        return new Vec2();

      case 1:
        return this.m_v1.w;

      case 2:
        return new Vec2(
          this.m_v1.a * this.m_v1.w.x + this.m_v2.a * this.m_v2.w.x,
          this.m_v1.a * this.m_v1.w.y + this.m_v2.a * this.m_v2.w.y,
        );

      default:
        Settings.b2Assert(false);
        return new Vec2();
    }
  }

  public GetWitnessPoints(pA: Vec2, pB: Vec2) {
    switch (this.m_count) {
      case 0:
        Settings.b2Assert(false);
        break;

      case 1:
        pA.SetV(this.m_v1.wA);
        pB.SetV(this.m_v1.wB);
        break;

      case 2:
        pA.x = this.m_v1.a * this.m_v1.wA.x + this.m_v2.a * this.m_v2.wA.x;
        pA.y = this.m_v1.a * this.m_v1.wA.y + this.m_v2.a * this.m_v2.wA.y;
        pB.x = this.m_v1.a * this.m_v1.wB.x + this.m_v2.a * this.m_v2.wB.x;
        pB.y = this.m_v1.a * this.m_v1.wB.y + this.m_v2.a * this.m_v2.wB.y;
        break;

      case 3:
        pB.x = pA.x =
          this.m_v1.a * this.m_v1.wA.x +
          this.m_v2.a * this.m_v2.wA.x +
          this.m_v3.a * this.m_v3.wA.x;

        pB.y = pA.y =
          this.m_v1.a * this.m_v1.wA.y +
          this.m_v2.a * this.m_v2.wA.y +
          this.m_v3.a * this.m_v3.wA.y;
        break;

      default:
        Settings.b2Assert(false);
        break;
    }
  }

  public GetMetric() {
    switch (this.m_count) {
      case 0:
        Settings.b2Assert(false);
        return 0;

      case 1:
        return 0;

      case 2:
        return SubtractVV(this.m_v1.w, this.m_v2.w).Length();

      case 3:
        return CrossVV(
          SubtractVV(this.m_v2.w, this.m_v1.w),
          SubtractVV(this.m_v3.w, this.m_v1.w),
        );

      default:
        Settings.b2Assert(false);
        return 0;
    }
  }

  public Solve2() {
    const w1 = this.m_v1.w;
    const w2 = this.m_v2.w;
    const e12 = SubtractVV(w2, w1);
    const d12_2 = -(w1.x * e12.x + w1.y * e12.y);

    if (d12_2 <= 0.0) {
      this.m_v1.a = 1;
      this.m_count = 1;
      return;
    }

    const d12_1 = w2.x * e12.x + w2.y * e12.y;
    if (d12_1 <= 0.0) {
      this.m_v2.a = 1;
      this.m_count = 1;
      this.m_v1.Set(this.m_v2);
      return;
    }

    const inv_d12 = 1 / (d12_1 + d12_2);
    this.m_v1.a = d12_1 * inv_d12;
    this.m_v2.a = d12_2 * inv_d12;
    this.m_count = 2;
  }

  public Solve3() {
    const w1 = this.m_v1.w;
    const w2 = this.m_v2.w;
    const w3 = this.m_v3.w;

    const e12 = SubtractVV(w2, w1);
    const w1e12 = Dot(w1, e12);
    const w2e12 = Dot(w2, e12);
    const d12_1 = w2e12;
    const d12_2 = -w1e12;

    const e13 = SubtractVV(w3, w1);
    const w1e13 = Dot(w1, e13);
    const w3e13 = Dot(w3, e13);
    const d13_1 = w3e13;
    const d13_2 = -w1e13;

    const e23 = SubtractVV(w3, w2);
    const w2e23 = Dot(w2, e23);
    const w3e23 = Dot(w3, e23);
    const d23_1 = w3e23;
    const d23_2 = -w2e23;

    const n123 = CrossVV(e12, e13);
    const d123_1 = n123 * CrossVV(w2, w3);
    const d123_2 = n123 * CrossVV(w3, w1);
    const d123_3 = n123 * CrossVV(w1, w2);

    if (d12_2 <= 0.0 && d13_2 <= 0.0) {
      this.m_v1.a = 1;
      this.m_count = 1;
      return;
    }

    if (d12_1 > 0.0 && d12_2 > 0.0 && d123_3 <= 0.0) {
      const inv_d12 = 1 / (d12_1 + d12_2);
      this.m_v1.a = d12_1 * inv_d12;
      this.m_v2.a = d12_2 * inv_d12;
      this.m_count = 2;
      return;
    }

    if (d13_1 > 0.0 && d13_2 > 0.0 && d123_2 <= 0.0) {
      const inv_d13 = 1 / (d13_1 + d13_2);
      this.m_v1.a = d13_1 * inv_d13;
      this.m_v3.a = d13_2 * inv_d13;
      this.m_count = 2;
      this.m_v2.Set(this.m_v3);
      return;
    }

    if (d12_1 <= 0.0 && d23_2 <= 0.0) {
      this.m_v2.a = 1;
      this.m_count = 1;
      this.m_v1.Set(this.m_v2);
      return;
    }

    if (d13_1 <= 0.0 && d23_1 <= 0.0) {
      this.m_v3.a = 1;
      this.m_count = 1;
      this.m_v1.Set(this.m_v3);
      return;
    }

    if (d23_1 > 0.0 && d23_2 > 0.0 && d123_1 <= 0.0) {
      const inv_d23 = 1 / (d23_1 + d23_2);
      this.m_v2.a = d23_1 * inv_d23;
      this.m_v3.a = d23_2 * inv_d23;
      this.m_count = 2;
      this.m_v1.Set(this.m_v3);
      return;
    }

    const inv_d123 = 1 / (d123_1 + d123_2 + d123_3);
    this.m_v1.a = d123_1 * inv_d123;
    this.m_v2.a = d123_2 * inv_d123;
    this.m_v3.a = d123_3 * inv_d123;
    this.m_count = 3;
  }
}

// tslint:disable variable-name

import {
  CrossVF,
  SubtractVV,
  MulX,
  MulMV,
  Clamp,
  MulTMV,
} from '../common/math';
import Vec2 from '../common/math/vec2';
import { b2Assert } from '../common/settings';
import DistanceProxy from './distance-proxy';
import SimplexCache from './simplex-cache';
import Transform from '../common/math/transform';

export default class SeparationFunction {
  public static e_points = 0x01;
  public static e_faceA = 0x02;
  public static e_faceB = 0x04;

  public m_localPoint = new Vec2();
  public m_axis = new Vec2();

  public m_proxyA?: DistanceProxy;
  public m_proxyB?: DistanceProxy;

  public m_type = SeparationFunction.e_points;

  public Initialize(
    cache: SimplexCache,
    proxyA: DistanceProxy,
    transformA: Transform,
    proxyB: DistanceProxy,
    transformB: Transform,
  ) {
    this.m_proxyA = proxyA;
    this.m_proxyB = proxyB;

    const count = parseInt(`${cache.count}`, 10);
    b2Assert(0 < count && count < 3);

    let localPointA: Vec2;
    let localPointA1: Vec2;
    let localPointA2: Vec2;

    let localPointB: Vec2;
    let localPointB1: Vec2;
    let localPointB2: Vec2;

    let pointAX = 0;
    let pointAY = 0;

    let pointBX = 0;
    let pointBY = 0;

    let normalX = 0;
    let normalY = 0;

    let tMat;
    let tVec;

    let s = 0;
    // let sgn = 0;

    if (count === 1) {
      this.m_type = SeparationFunction.e_points;

      localPointA = this.m_proxyA.GetVertex(cache.indexA[0]);
      localPointB = this.m_proxyB.GetVertex(cache.indexB[0]);

      tVec = localPointA;
      tMat = transformA.R;

      pointAX =
        transformA.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
      pointAY =
        transformA.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

      tVec = localPointB;
      tMat = transformB.R;

      pointBX =
        transformB.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
      pointBY =
        transformB.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

      this.m_axis.x = pointBX - pointAX;
      this.m_axis.y = pointBY - pointAY;
      this.m_axis.Normalize();
    } else if (cache.indexB[0] === cache.indexB[1]) {
      this.m_type = SeparationFunction.e_faceA;

      localPointA1 = this.m_proxyA.GetVertex(cache.indexA[0]);
      localPointA2 = this.m_proxyA.GetVertex(cache.indexA[1]);
      localPointB = this.m_proxyB.GetVertex(cache.indexB[0]);

      this.m_localPoint.x = 0.5 * (localPointA1.x + localPointA2.x);
      this.m_localPoint.y = 0.5 * (localPointA1.y + localPointA2.y);
      this.m_axis = CrossVF(SubtractVV(localPointA2, localPointA1), 1.0);

      this.m_axis.Normalize();

      tVec = this.m_axis;
      tMat = transformA.R;

      normalX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
      normalY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

      tVec = this.m_localPoint;
      tMat = transformA.R;

      pointAX =
        transformA.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
      pointAY =
        transformA.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

      tVec = localPointB;
      tMat = transformB.R;

      pointBX =
        transformB.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
      pointBY =
        transformB.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

      s = (pointBX - pointAX) * normalX + (pointBY - pointAY) * normalY;
      if (s < 0.0) {
        this.m_axis.NegativeSelf();
      }
    } else if (cache.indexA[0] === cache.indexA[0]) {
      this.m_type = SeparationFunction.e_faceB;

      localPointB1 = this.m_proxyB.GetVertex(cache.indexB[0]);
      localPointB2 = this.m_proxyB.GetVertex(cache.indexB[1]);
      localPointA = this.m_proxyA.GetVertex(cache.indexA[0]);

      this.m_localPoint.x = 0.5 * (localPointB1.x + localPointB2.x);
      this.m_localPoint.y = 0.5 * (localPointB1.y + localPointB2.y);

      this.m_axis = CrossVF(SubtractVV(localPointB2, localPointB1), 1.0);
      this.m_axis.Normalize();

      tVec = this.m_axis;
      tMat = transformB.R;

      normalX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
      normalY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

      tVec = this.m_localPoint;
      tMat = transformB.R;

      pointBX =
        transformB.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
      pointBY =
        transformB.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

      tVec = localPointA;
      tMat = transformA.R;

      pointAX =
        transformA.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
      pointAY =
        transformA.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

      s = (pointAX - pointBX) * normalX + (pointAY - pointBY) * normalY;
      if (s < 0.0) {
        this.m_axis.NegativeSelf();
      }
    } else {
      localPointA1 = this.m_proxyA.GetVertex(cache.indexA[0]);
      localPointA2 = this.m_proxyA.GetVertex(cache.indexA[1]);

      localPointB1 = this.m_proxyB.GetVertex(cache.indexB[0]);
      localPointB2 = this.m_proxyB.GetVertex(cache.indexB[1]);

      // const pA = MulX(transformA, localPointA);
      const dA = MulMV(transformA.R, SubtractVV(localPointA2, localPointA1));
      // const pB = MulX(transformB, localPointB);
      const dB = MulMV(transformB.R, SubtractVV(localPointB2, localPointB1));

      const a = dA.x * dA.x + dA.y * dA.y;
      const e = dB.x * dB.x + dB.y * dB.y;

      const r = SubtractVV(dB, dA);
      const c = dA.x * r.x + dA.y * r.y;
      const f = dB.x * r.x + dB.y * r.y;
      const b = dA.x * dB.x + dA.y * dB.y;

      const denom = a * e - b * b;
      s = 0.0;

      if (denom !== 0.0) {
        s = Clamp((b * f - c * e) / denom, 0.0, 1.0);
      }

      let t = (b * s + f) / e;
      if (t < 0.0) {
        t = 0.0;
        s = Clamp((b - c) / a, 0.0, 1.0);
      }

      localPointA = new Vec2();
      localPointA.x = localPointA1.x + s * (localPointA2.x - localPointA1.x);
      localPointA.y = localPointA1.y + s * (localPointA2.y - localPointA1.y);

      localPointB = new Vec2();
      localPointB.x = localPointB1.x + s * (localPointB2.x - localPointB1.x);
      localPointB.y = localPointB1.y + s * (localPointB2.y - localPointB1.y);

      if (s === 0.0 || s === 1.0) {
        this.m_type = SeparationFunction.e_faceB;

        this.m_axis = CrossVF(SubtractVV(localPointB2, localPointB1), 1.0);
        this.m_axis.Normalize();
        this.m_localPoint = localPointB;

        tVec = this.m_axis;
        tMat = transformB.R;

        normalX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
        normalY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

        tVec = this.m_localPoint;
        tMat = transformB.R;

        pointBX =
          transformB.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
        pointBY =
          transformB.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

        tVec = localPointA;
        tMat = transformA.R;

        pointAX =
          transformA.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
        pointAY =
          transformA.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

        // sgn = (pointAX - pointBX) * normalX + (pointAY - pointBY) * normalY;
        if (s < 0.0) {
          this.m_axis.NegativeSelf();
        }
      } else {
        this.m_type = SeparationFunction.e_faceA;

        this.m_axis = CrossVF(SubtractVV(localPointA2, localPointA1), 1.0);
        this.m_localPoint = localPointA;

        tVec = this.m_axis;
        tMat = transformA.R;

        normalX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
        normalY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

        tVec = this.m_localPoint;
        tMat = transformA.R;

        pointAX =
          transformA.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
        pointAY =
          transformA.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

        tVec = localPointB;
        tMat = transformB.R;

        pointBX =
          transformB.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
        pointBY =
          transformB.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

        // sgn = (pointBX - pointAX) * normalX + (pointBY - pointAY) * normalY;
        if (s < 0.0) {
          this.m_axis.NegativeSelf();
        }
      }
    }
  }

  public Evaluate(transformA: Transform, transformB: Transform) {
    if (!(this.m_proxyA && this.m_proxyB)) {
      return 0;
    }

    let axisA;
    let axisB;
    let localPointA;
    let localPointB;
    let pointA;
    let pointB;
    let seperation = 0;
    let normal;

    switch (this.m_type) {
      case SeparationFunction.e_points: {
        axisA = MulTMV(transformA.R, this.m_axis);
        axisB = MulTMV(transformB.R, this.m_axis.GetNegative());

        localPointA = this.m_proxyA.GetSupportVertex(axisA);
        localPointB = this.m_proxyB.GetSupportVertex(axisB);

        pointA = MulX(transformA, localPointA);
        pointB = MulX(transformB, localPointB);

        seperation =
          (pointB.x - pointA.x) * this.m_axis.x +
          (pointB.y - pointA.y) * this.m_axis.y;

        return seperation;
      }

      case SeparationFunction.e_faceA: {
        normal = MulMV(transformA.R, this.m_axis);
        pointA = MulX(transformA, this.m_localPoint);

        axisB = MulTMV(transformB.R, normal.GetNegative());
        localPointB = this.m_proxyB.GetSupportVertex(axisB);

        pointB = MulX(transformB, localPointB);
        seperation =
          (pointB.x - pointA.x) * normal.x + (pointB.y - pointA.y) * normal.y;

        return seperation;
      }

      case SeparationFunction.e_faceB: {
        normal = MulMV(transformB.R, this.m_axis);
        pointB = MulX(transformB, this.m_localPoint);

        axisA = MulTMV(transformA.R, normal.GetNegative());
        localPointA = this.m_proxyA.GetSupportVertex(axisA);

        pointA = MulX(transformA, localPointA);
        seperation =
          (pointA.x - pointB.x) * normal.x + (pointA.y - pointB.y) * normal.y;

        return seperation;
      }

      default:
        b2Assert(false);
        return 0;
    }
  }
}

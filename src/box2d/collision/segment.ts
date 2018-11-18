// tslint:disable variable-name

import Vec2 from '../common/math/vec2';
import Aabb from './aabb';

export default class Segment {
  public p1 = new Vec2();
  public p2 = new Vec2();

  public TestSegment(
    lambda: any[],
    normal: Vec2,
    segment: Segment,
    maxLambda = 0,
  ) {
    const s = segment.p1;

    const rX = segment.p2.x - s.x;
    const rY = segment.p2.y - s.y;

    const dX = this.p2.x - this.p1.x;
    const dY = this.p2.y - this.p1.y;

    let nX = dY;
    let nY = -dX;

    const k_slop = 100.0 * Number.MIN_VALUE;
    const denom = -(rX * nX + rY * nY);

    if (denom > k_slop) {
      const bX = s.x - this.p1.x;
      const bY = s.y - this.p1.y;
      let a = bX * nX + bY * nY;

      if (0.0 <= a && a <= maxLambda * denom) {
        const mu2 = -rX * bY + rY * bX;

        if (-k_slop * denom <= mu2 && mu2 <= denom * (1.0 + k_slop)) {
          a /= denom;
          const nLen = Math.sqrt(nX * nX + nY * nY);
          nX /= nLen;
          nY /= nLen;
          lambda[0] = a;
          normal.Set(nX, nY);
          return true;
        }
      }
    }

    return false;
  }

  public Extend(aabb: Aabb) {
    this.ExtendForward(aabb);
    this.ExtendBackward(aabb);
  }

  public ExtendForward(aabb: Aabb) {
    const dX = this.p2.x - this.p1.x;
    const dY = this.p2.y - this.p1.y;

    const lambda = Math.min(
      dX > 0
        ? (aabb.upperBound.x - this.p1.x) / dX
        : dX < 0
          ? (aabb.lowerBound.x - this.p1.x) / dX
          : Number.POSITIVE_INFINITY,

      dY > 0
        ? (aabb.upperBound.y - this.p1.y) / dY
        : dY < 0
          ? (aabb.lowerBound.y - this.p1.y) / dY
          : Number.POSITIVE_INFINITY,
    );

    this.p2.x = this.p1.x + dX * lambda;
    this.p2.y = this.p1.y + dY * lambda;
  }

  public ExtendBackward(aabb: Aabb) {
    const dX = -this.p2.x + this.p1.x;
    const dY = -this.p2.y + this.p1.y;

    const lambda = Math.min(
      dX > 0
        ? (aabb.upperBound.x - this.p2.x) / dX
        : dX < 0
          ? (aabb.lowerBound.x - this.p2.x) / dX
          : Number.POSITIVE_INFINITY,

      dY > 0
        ? (aabb.upperBound.y - this.p2.y) / dY
        : dY < 0
          ? (aabb.lowerBound.y - this.p2.y) / dY
          : Number.POSITIVE_INFINITY,
    );

    this.p1.x = this.p2.x + dX * lambda;
    this.p1.y = this.p2.y + dY * lambda;
  }
}

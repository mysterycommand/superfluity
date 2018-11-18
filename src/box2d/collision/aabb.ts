// tslint:disable variable-name

import Vec2 from '../common/math/vec2';

export default class Aabb {
  public static Combine(aabb1: Aabb, aabb2: Aabb) {
    const aabb = new Aabb();
    aabb.Combine(aabb1, aabb2);
    return aabb;
  }

  public lowerBound = new Vec2();
  public upperBound = new Vec2();

  public IsValid() {
    const dX = this.upperBound.x - this.lowerBound.x;
    const dY = this.upperBound.y - this.lowerBound.y;
    return (
      dX >= 0.0 &&
      dY >= 0.0 &&
      this.lowerBound.IsValid() &&
      this.upperBound.IsValid()
    );
  }

  public GetCenter() {
    return new Vec2(
      (this.lowerBound.x + this.upperBound.x) / 2,
      (this.lowerBound.y + this.upperBound.y) / 2,
    );
  }

  public GetExtents() {
    return new Vec2(
      (this.upperBound.x - this.lowerBound.x) / 2,
      (this.upperBound.y - this.lowerBound.y) / 2,
    );
  }

  public Contains(aabb: Aabb) {
    return (
      this.lowerBound.x <= aabb.lowerBound.x &&
      this.lowerBound.y <= aabb.lowerBound.y &&
      aabb.upperBound.x <= this.upperBound.x &&
      aabb.upperBound.y <= this.upperBound.y
    );
  }

  public RayCast(
    output: { normal: { x: number; y: number }; fraction: number },
    input: { p1: { x: number; y: number }; p2: { x: number; y: number } },
  ) {
    let tmin = -Number.MAX_VALUE;
    let tmax = Number.MAX_VALUE;

    const pX = input.p1.x;
    const pY = input.p1.y;

    const dX = input.p2.x - input.p1.x;
    const dY = input.p2.y - input.p1.y;

    const absDX = Math.abs(dX);
    const absDY = Math.abs(dY);
    const normal = output.normal;

    let inv_d = 0;
    let t1 = 0;
    let t2 = 0;
    let t3 = 0;
    let s = 0;

    {
      if (absDX < Number.MIN_VALUE) {
        if (pX < this.lowerBound.x || this.upperBound.x < pX) {
          return false;
        }
      } else {
        inv_d = 1.0 / dX;
        t1 = (this.lowerBound.x - pX) * inv_d;
        t2 = (this.upperBound.x - pX) * inv_d;
        s = -1.0;

        if (t1 > t2) {
          t3 = t1;
          t1 = t2;
          t2 = t3;
          s = 1.0;
        }

        if (t1 > tmin) {
          normal.x = s;
          normal.y = 0;
          tmin = t1;
        }

        tmax = Math.min(tmax, t2);
        if (tmin > tmax) {
          return false;
        }
      }
    }

    {
      if (absDY < Number.MIN_VALUE) {
        if (pY < this.lowerBound.y || this.upperBound.y < pY) {
          return false;
        }
      } else {
        inv_d = 1.0 / dY;
        t1 = (this.lowerBound.y - pY) * inv_d;
        t2 = (this.upperBound.y - pY) * inv_d;
        s = -1.0;

        if (t1 > t2) {
          t3 = t1;
          t1 = t2;
          t2 = t3;
          s = 1.0;
        }

        if (t1 > tmin) {
          normal.y = s;
          normal.x = 0;
          tmin = t1;
        }

        tmax = Math.min(tmax, t2);
        if (tmin > tmax) {
          return false;
        }
      }
    }

    output.fraction = tmin;
    return true;
  }

  public TestOverlap(other: Aabb) {
    const d1X = other.lowerBound.x - this.upperBound.x;
    const d1Y = other.lowerBound.y - this.upperBound.y;

    const d2X = this.lowerBound.x - other.upperBound.x;
    const d2Y = this.lowerBound.y - other.upperBound.y;

    return d1X < 0.0 || d1Y < 0.0 || d2X < 0.0 || d2Y < 0.0;
  }

  public Combine(aabb1: Aabb, aabb2: Aabb) {
    this.lowerBound.x = Math.min(aabb1.lowerBound.x, aabb2.lowerBound.x);
    this.lowerBound.y = Math.min(aabb1.lowerBound.y, aabb2.lowerBound.y);
    this.upperBound.x = Math.max(aabb1.upperBound.x, aabb2.upperBound.x);
    this.upperBound.y = Math.max(aabb1.upperBound.y, aabb2.upperBound.y);
  }
}

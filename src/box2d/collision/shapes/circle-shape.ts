// tslint:disable variable-name

import Shape from './shape';
import { b2_pi } from '../../common/settings';
import Vec2 from '../../common/math/vec2';
import { MulX, Dot } from '../../common/math';
import Transform from '../../common/math/transform';
// import RayCastOutput from '../ray-cast-output';
// import RayCastInput from '../ray-cast-input';
import Aabb from '../aabb';
import MassData from './mass-data';
import RayCastOutput from '../ray-cast-output';
import RayCastInput from '../ray-cast-input';

export default class CircleShape extends Shape {
  public m_p = new Vec2();

  constructor(public m_radius = 0) {
    super();
    this.m_type = Shape.e_circleShape;
  }

  public Copy() {
    const copy = new CircleShape();
    copy.Set(this);
    return copy;
  }

  public Set(other: Shape) {
    super.Set(other);

    if (other instanceof CircleShape) {
      this.m_p.SetV(other.m_p);
    }
  }

  public TestPoint(xf: Transform, p: Vec2) {
    const tMat = xf.R;

    let dX =
      xf.position.x + (tMat.col1.x * this.m_p.x + tMat.col2.x * this.m_p.y);
    let dY =
      xf.position.y + (tMat.col1.y * this.m_p.x + tMat.col2.y * this.m_p.y);

    dX = p.x - dX;
    dY = p.y - dY;

    return dX * dX + dY * dY <= this.m_radius * this.m_radius;
  }

  public RayCast(
    output: RayCastOutput,
    input: RayCastInput,
    transform: Transform,
  ) {
    const tMat = transform.R;

    const positionX =
      transform.position.x +
      (tMat.col1.x * this.m_p.x + tMat.col2.x * this.m_p.y);

    const positionY =
      transform.position.y +
      (tMat.col1.y * this.m_p.x + tMat.col2.y * this.m_p.y);

    const sX = input.p1.x - positionX;
    const sY = input.p1.y - positionY;

    const b = sX * sX + sY * sY - this.m_radius * this.m_radius;
    const rX = input.p2.x - input.p1.x;
    const rY = input.p2.y - input.p1.y;

    const c = sX * rX + sY * rY;
    const rr = rX * rX + rY * rY;

    const sigma = c * c - rr * b;
    if (sigma < 0.0 || rr < Number.MIN_VALUE) {
      return false;
    }

    let a = -(c + Math.sqrt(sigma));
    if (0.0 <= a && a <= input.maxFraction * rr) {
      a /= rr;

      output.fraction = a;
      output.normal.x = sX + a * rX;
      output.normal.y = sY + a * rY;
      output.normal.Normalize();

      return true;
    }

    return false;
  }

  public ComputeAABB(aabb: Aabb, transform: Transform) {
    const tMat = transform.R;

    const pX =
      transform.position.x +
      (tMat.col1.x * this.m_p.x + tMat.col2.x * this.m_p.y);

    const pY =
      transform.position.y +
      (tMat.col1.y * this.m_p.x + tMat.col2.y * this.m_p.y);

    aabb.lowerBound.Set(pX - this.m_radius, pY - this.m_radius);
    aabb.upperBound.Set(pX + this.m_radius, pY + this.m_radius);
  }

  public ComputeMass(massData: MassData, density = 0) {
    massData.mass = density * b2_pi * this.m_radius * this.m_radius;
    massData.center.SetV(this.m_p);
    massData.I =
      massData.mass *
      (0.5 * this.m_radius * this.m_radius +
        (this.m_p.x * this.m_p.x + this.m_p.y * this.m_p.y));
  }

  public ComputeSubmergedArea(
    normal: Vec2,
    offset = 0,
    xf: Transform,
    c: Vec2,
  ) {
    const p = MulX(xf, this.m_p);
    const l = -(Dot(normal, p) - offset);

    if (l < -this.m_radius + Number.MIN_VALUE) {
      return 0;
    }

    if (l > this.m_radius) {
      c.SetV(p);
      return Math.PI * this.m_radius * this.m_radius;
    }

    const r2 = this.m_radius * this.m_radius;
    const l2 = l * l;

    const area =
      r2 * (Math.asin(l / this.m_radius) + Math.PI / 2) +
      l * Math.sqrt(r2 - l2);

    const com = ((-2 / 3) * Math.pow(r2 - l2, 1.5)) / area;
    c.x = p.x + normal.x * com;
    c.y = p.y + normal.y * com;

    return area;
  }

  public GetLocalPosition() {
    return this.m_p;
  }

  public SetLocalPosition(position: Vec2) {
    this.m_p.SetV(position);
  }

  public GetRadius() {
    return this.m_radius;
  }

  public SetRadius(radius = 0) {
    this.m_radius = radius;
  }
}

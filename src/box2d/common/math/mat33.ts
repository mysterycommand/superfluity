import Vec2 from './vec2';
import Vec3 from './vec3';

export default class Mat33 {
  public col1 = new Vec3();
  public col2 = new Vec3();
  public col3 = new Vec3();

  constructor(col1?: Vec3, col2?: Vec3, col3?: Vec3) {
    if (!(col1 && col2 && col3)) {
      this.col1.SetZero();
      this.col2.SetZero();
      this.col3.SetZero();
    } else {
      this.SetVVV(col1, col2, col3);
    }
  }

  public SetVVV(col1: Vec3, col2: Vec3, col3: Vec3) {
    this.col1.SetV(col1);
    this.col2.SetV(col2);
    this.col3.SetV(col3);
  }

  public Copy() {
    return new Mat33(this.col1, this.col2, this.col3);
  }

  public SetM(m: Mat33) {
    const { col1, col2, col3 } = m;
    this.SetVVV(col1, col2, col3);
  }

  public AddM(m: Mat33) {
    this.col1.x += m.col1.x;
    this.col1.y += m.col1.y;
    this.col1.z += m.col1.z;

    this.col2.x += m.col2.x;
    this.col2.y += m.col2.y;
    this.col2.z += m.col2.z;

    this.col3.x += m.col3.x;
    this.col3.y += m.col3.y;
    this.col3.z += m.col3.z;
  }

  public SetIdentity() {
    this.col1.x = 1.0;
    this.col1.y = 0.0;
    this.col1.z = 0.0;

    this.col2.x = 0.0;
    this.col2.y = 1.0;
    this.col2.z = 0.0;

    this.col3.x = 0.0;
    this.col3.y = 0.0;
    this.col3.z = 1.0;
  }

  public SetZero() {
    this.col1.x = 0.0;
    this.col1.y = 0.0;
    this.col1.z = 0.0;

    this.col2.x = 0.0;
    this.col2.y = 0.0;
    this.col2.z = 0.0;

    this.col3.x = 0.0;
    this.col3.y = 0.0;
    this.col3.z = 0.0;
  }

  public Solve22(out: Vec2, bX = 0, bY = 0) {
    const a11 = this.col1.x;
    const a21 = this.col1.y;

    const a12 = this.col2.x;
    const a22 = this.col2.y;

    let det = a11 * a22 - a12 * a21;
    if (det !== 0.0) {
      det = 1.0 / det;
    }

    out.x = det * (a22 * bX - a12 * bY);
    out.y = det * (a11 * bY - a21 * bX);

    return out;
  }

  public Solve33(out: Vec3, bX = 0, bY = 0, bZ = 0) {
    const a11 = this.col1.x;
    const a21 = this.col1.y;
    const a31 = this.col1.z;

    const a12 = this.col2.x;
    const a22 = this.col2.y;
    const a32 = this.col2.z;

    const a13 = this.col3.x;
    const a23 = this.col3.y;
    const a33 = this.col3.z;

    let det =
      a11 * (a22 * a33 - a32 * a23) +
      a21 * (a32 * a13 - a12 * a33) +
      a31 * (a12 * a23 - a22 * a13);
    if (det !== 0.0) {
      det = 1.0 / det;
    }

    out.x =
      det *
      (bX * (a22 * a33 - a32 * a23) +
        bY * (a32 * a13 - a12 * a33) +
        bZ * (a12 * a23 - a22 * a13));

    out.y =
      det *
      (a11 * (bY * a33 - bZ * a23) +
        a21 * (bZ * a13 - bX * a33) +
        a31 * (bX * a23 - bY * a13));

    out.z =
      det *
      (a11 * (a22 * bZ - a32 * bY) +
        a21 * (a32 * bX - a12 * bZ) +
        a31 * (a12 * bY - a22 * bX));

    return out;
  }
}

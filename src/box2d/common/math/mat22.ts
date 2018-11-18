import Vec2 from './vec2';

export default class Mat22 {
  public static FromAngle(angle = 0) {
    const mat = new Mat22();
    mat.Set(angle);
    return mat;
  }

  public static FromVV(c1: Vec2, c2: Vec2) {
    const mat = new Mat22();
    mat.SetVV(c1, c2);
    return mat;
  }

  public col1 = new Vec2();
  public col2 = new Vec2();

  constructor() {
    this.SetIdentity();
  }

  public Set(angle = 0) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    this.col1.x = c;
    this.col2.x = -s;

    this.col1.y = s;
    this.col2.y = c;
  }

  public SetVV(c1: Vec2, c2: Vec2) {
    this.col1.SetV(c1);
    this.col2.SetV(c2);
  }

  public Copy() {
    const mat = new Mat22();
    mat.SetM(this);
    return mat;
  }

  public SetM(m: Mat22) {
    this.col1.SetV(m.col1);
    this.col2.SetV(m.col2);
  }

  public AddM(m: Mat22) {
    this.col1.x += m.col1.x;
    this.col1.y += m.col1.y;
    this.col2.x += m.col2.x;
    this.col2.y += m.col2.y;
  }

  public SetIdentity() {
    this.col1.x = 1.0;
    this.col2.x = 0.0;
    this.col1.y = 0.0;
    this.col2.y = 1.0;
  }

  public SetZero() {
    this.col1.x = 0.0;
    this.col2.x = 0.0;
    this.col1.y = 0.0;
    this.col2.y = 0.0;
  }

  public GetAngle() {
    return Math.atan2(this.col1.y, this.col1.x);
  }

  public GetInverse(out: Mat22) {
    const a = this.col1.x;
    const b = this.col2.x;

    const c = this.col1.y;
    const d = this.col2.y;

    let det = a * d - b * c;
    if (det !== 0.0) {
      det = 1.0 / det;
    }

    out.col1.x = det * d;
    out.col2.x = -det * b;
    out.col1.y = -det * c;
    out.col2.y = det * a;
    return out;
  }

  public Solve(out: Vec2, bX = 0, bY = 0) {
    const a11 = this.col1.x;
    const a12 = this.col2.x;

    const a21 = this.col1.y;
    const a22 = this.col2.y;

    let det = a11 * a22 - a12 * a21;
    if (det !== 0.0) {
      det = 1.0 / det;
    }

    out.x = det * (a22 * bX - a12 * bY);
    out.y = det * (a11 * bY - a21 * bX);
    return out;
  }

  public Abs() {
    this.col1.Abs();
    this.col2.Abs();
  }
}

import { Dot } from './';

export default class Vec2 {
  public static Make(x = 0, y = 0) {
    return new Vec2(x, y);
  }

  constructor(public x = 0, public y = 0) {}

  public SetZero() {
    this.x = 0.0;
    this.y = 0.0;
  }

  public Set(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  public SetV(v: Vec2) {
    this.x = v.x;
    this.y = v.y;
  }

  public GetNegative() {
    return new Vec2(-this.x, -this.y);
  }

  public NegativeSelf() {
    this.x = -this.x;
    this.y = -this.y;
  }

  public Copy() {
    return new Vec2(this.x, this.y);
  }

  public Add(v: Vec2) {
    this.x += v.x;
    this.y += v.y;
  }

  public Subtract(v: Vec2) {
    this.x -= v.x;
    this.y -= v.y;
  }

  public Multiply(a = 0) {
    this.x *= a;
    this.y *= a;
  }

  public MulM(A: {
    col1: { x: number; y: number };
    col2: { x: number; y: number };
  }) {
    const tX = this.x;
    this.x = A.col1.x * tX + A.col2.x * this.y;
    this.y = A.col1.y * tX + A.col2.y * this.y;
  }

  public MulTM(A: { col1: Vec2; col2: Vec2 }) {
    const tX = Dot(this, A.col1);
    this.y = Dot(this, A.col2);
    this.x = tX;
  }

  public CrossVF(s = 0) {
    const tX = this.x;
    this.x = s * this.y;
    this.y = -s * tX;
  }

  public CrossFV(s = 0) {
    const tX = this.x;
    this.x = -s * this.y;
    this.y = s * tX;
  }

  public MinV(b: Vec2) {
    this.x = this.x < b.x ? this.x : b.x;
    this.y = this.y < b.y ? this.y : b.y;
  }

  public MaxV(b: Vec2) {
    this.x = this.x > b.x ? this.x : b.x;
    this.y = this.y > b.y ? this.y : b.y;
  }

  public Abs() {
    if (this.x < 0) {
      this.x = -this.x;
    }

    if (this.y < 0) {
      this.y = -this.y;
    }
  }

  public Length() {
    return Math.hypot(this.x, this.y);
    // return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  public LengthSquared() {
    return this.x * this.x + this.y * this.y;
  }

  public Normalize() {
    const length = this.Length();

    if (length < Number.MIN_VALUE) {
      return 0;
    }

    const invLength = 1 / length;

    this.x *= invLength;
    this.y *= invLength;

    return length;
  }

  public IsValid() {
    return isFinite(this.x) && isFinite(this.y);
  }
}

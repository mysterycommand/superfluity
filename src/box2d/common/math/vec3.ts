export default class Vec3 {
  constructor(public x = 0, public y = 0, public z = 0) {}

  public SetZero() {
    this.x = this.y = this.z = 0.0;
  }

  public Set(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  public SetV(v: Vec3) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
  }

  public GetNegative() {
    return new Vec3(-this.x, -this.y, -this.z);
  }

  public NegativeSelf() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
  }

  public Copy() {
    return new Vec3(this.x, this.y, this.z);
  }

  public Add(v: Vec3) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
  }

  public Subtract(v: Vec3) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
  }

  public Multiply(a = 0) {
    this.x *= a;
    this.y *= a;
    this.z *= a;
  }
}

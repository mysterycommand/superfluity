import Vec2 from '../../common/math/vec2';

export default class Jacobian {
  public linearA = new Vec2();
  public linearB = new Vec2();

  public angularA = 0;
  public angularB = 0;

  public SetZero() {
    this.linearA.SetZero();
    this.angularA = 0;
    this.linearB.SetZero();
    this.angularB = 0;
  }

  public Set(x1: Vec2, a1 = 0, x2: Vec2, a2 = 0) {
    this.linearA.SetV(x1);
    this.angularA = a1;
    this.linearB.SetV(x2);
    this.angularB = a2;
  }

  public Compute(x1: Vec2, a1 = 0, x2: Vec2, a2 = 0) {
    return (
      this.linearA.x * x1.x +
      this.linearA.y * x1.y +
      this.angularA * a1 +
      (this.linearB.x * x2.x + this.linearB.y * x2.y) +
      this.angularB * a2
    );
  }
}

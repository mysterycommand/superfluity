import Vec2 from './vec2';
import Transform from './transform';

export default class Sweep {
  public localCenter = new Vec2();
  public c0 = new Vec2();
  public c = new Vec2();

  public a0 = 0;
  public a = 0;
  public t0 = 0;

  public Set(other: Sweep) {
    this.localCenter.SetV(other.localCenter);
    this.c0.SetV(other.c0);
    this.c.SetV(other.c);

    this.a0 = other.a0;
    this.a = other.a;
    this.t0 = other.t0;
  }

  public Copy() {
    const copy = new Sweep();
    copy.Set(this);
    return copy;
  }

  public GetTransform(xf: Transform, alpha = 0) {
    xf.position.x = (1.0 - alpha) * this.c0.x + alpha * this.c.x;
    xf.position.y = (1.0 - alpha) * this.c0.y + alpha * this.c.y;

    const angle = (1.0 - alpha) * this.a0 + alpha * this.a;
    xf.R.Set(angle);

    const tMat = xf.R;

    xf.position.x -=
      tMat.col1.x * this.localCenter.x + tMat.col2.x * this.localCenter.y;

    xf.position.y -=
      tMat.col1.y * this.localCenter.x + tMat.col2.y * this.localCenter.y;
  }

  public Advance(t = 0) {
    if (this.t0 < t && 1.0 - this.t0 > Number.MIN_VALUE) {
      const alpha = (t - this.t0) / (1.0 - this.t0);

      this.c0.x = (1.0 - alpha) * this.c0.x + alpha * this.c.x;
      this.c0.y = (1.0 - alpha) * this.c0.y + alpha * this.c.y;

      this.a0 = (1.0 - alpha) * this.a0 + alpha * this.a;
      this.t0 = t;
    }
  }
}

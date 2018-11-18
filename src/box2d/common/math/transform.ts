import Vec2 from './vec2';
import Mat22 from './mat22';

export default class Transform {
  public position = new Vec2();
  public R = new Mat22();

  constructor(pos?: Vec2, r?: Mat22) {
    if (pos) {
      this.position.SetV(pos);
    }

    if (r) {
      this.R.SetM(r);
    }
  }

  public Initialize(pos: Vec2, r: Mat22) {
    this.position.SetV(pos);
    this.R.SetM(r);
  }

  public SetIdentity() {
    this.position.SetZero();
    this.R.SetIdentity();
  }

  public Set(x: Transform) {
    this.position.SetV(x.position);
    this.R.SetM(x.R);
  }

  public GetAngle() {
    return Math.atan2(this.R.col1.y, this.R.col1.x);
  }
}

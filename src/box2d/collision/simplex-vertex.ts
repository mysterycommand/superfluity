import Vec2 from '../common/math/vec2';

export default class SimplexVertex {
  public wA = new Vec2();
  public wB = new Vec2();
  public w = new Vec2();
  public a = 0;
  public indexA = 0;
  public indexB = 0;

  public Set(other: SimplexVertex) {
    this.wA.SetV(other.wA);
    this.wB.SetV(other.wB);
    this.w.SetV(other.w);
    this.a = other.a;
    this.indexA = other.indexA;
    this.indexB = other.indexB;
  }
}

import Vec2 from '../common/math/vec2';
import Transform from '../common/math/transform';

export default class Point {
  public p = new Vec2();

  public Support(xf: Transform, vX = 0, vY = 0) {
    return this.p;
  }

  public GetFirstVertex(xf: Transform) {
    return this.p;
  }
}

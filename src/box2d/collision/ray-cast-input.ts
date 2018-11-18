import Vec2 from '../common/math/vec2';

export default class RayCastInput {
  constructor(
    public p1 = new Vec2(),
    public p2 = new Vec2(),
    public maxFraction = 1,
  ) {}
}

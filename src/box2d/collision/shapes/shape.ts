// tslint:disable variable-name

import { b2_linearSlop } from '../../common/settings';
import Transform from '../../common/math/transform';
import DistanceInput from '../distance-input';
import DistanceOutput from '../distance-output';
import DistanceProxy from '../distance-proxy';
import SimplexCache from '../simplex-cache';
import { Distance } from '../distance';
import Vec2 from '../../common/math/vec2';
import RayCastOutput from '../ray-cast-output';
import RayCastInput from '../ray-cast-input';
import MassData from './mass-data';
import Aabb from '../aabb';

export default class Shape {
  public static e_unknownShape = parseInt('-1', 10);
  public static e_circleShape = 0;
  public static e_polygonShape = 1;
  public static e_edgeShape = 2;
  public static e_shapeTypeCount = 3;
  public static e_hitCollide = 1;
  public static e_missCollide = 0;
  public static e_startsInsideCollide = parseInt('-1', 10);

  public static TestOverlap(
    shape1: Shape,
    transform1: Transform,
    shape2: Shape,
    transform2: Transform,
  ) {
    const input = new DistanceInput();

    input.proxyA = new DistanceProxy();
    input.proxyA.Set(shape1);

    input.proxyB = new DistanceProxy();
    input.proxyB.Set(shape2);

    input.transformA = transform1;
    input.transformB = transform2;

    input.useRadii = true;

    const simplexCache = new SimplexCache();
    simplexCache.count = 0;

    const output = new DistanceOutput();
    Distance(output, simplexCache, input);

    return output.distance < 10.0 * Number.MIN_VALUE;
  }

  public m_type = Shape.e_unknownShape;
  public m_radius = b2_linearSlop;

  // public Copy(): Shape {
  //   return null;
  // }

  public Set(other: Shape) {
    this.m_radius = other.m_radius;
  }

  public GetType() {
    return this.m_type;
  }

  public TestPoint(xf: Transform, p: Vec2) {
    return false;
  }

  public RayCast(
    output: RayCastOutput,
    input: RayCastInput,
    transform: Transform,
  ) {
    return false;
  }

  // tslint:disable-next-line no-empty
  public ComputeAABB(aabb: Aabb, xf: Transform) {}

  // tslint:disable-next-line no-empty
  public ComputeMass(massData: MassData, density = 0) {}

  // public ComputeSubmergedArea(normal: Vec2, offset = 0, xf: Transform, c: any) {
  //   return 0;
  // }
}

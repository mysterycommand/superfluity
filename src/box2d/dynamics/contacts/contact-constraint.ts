import { b2_maxManifoldPoints } from '../../common/settings';
import Mat22 from '../../common/math/mat22';
import Vec2 from '../../common/math/vec2';
import ContactConstraintPoint from './contact-constraint-point';

export default class ContactConstraint {
  public localPlaneNormal = new Vec2();
  public localPoint = new Vec2();
  public normal = new Vec2();
  public normalMass = new Mat22();
  public K = new Mat22();
  public points = new Array(b2_maxManifoldPoints).fill(0);

  constructor() {
    this.points = this.points.map(() => new ContactConstraintPoint());
  }
}

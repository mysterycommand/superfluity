import Vec2 from '../../common/math/vec2';
import Body from '../body';

import JointDef from './joint-def';
import Joint from './joint';

export default class DistanceJointDef extends JointDef {
  public type = Joint.e_distanceJoint;

  public localAnchorA = new Vec2();
  public localAnchorB = new Vec2();

  public length = 1;
  public frequencyHz = 0;
  public dampingRatio = 0;

  public Initialize(bodyA: Body, bodyB: Body, anchorA: Vec2, anchorB: Vec2) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;

    this.localAnchorA.SetV(this.bodyA.GetLocalPoint(anchorA));
    this.localAnchorB.SetV(this.bodyB.GetLocalPoint(anchorB));

    const dX = anchorB.x - anchorA.x;
    const dY = anchorB.y - anchorA.y;

    this.length = Math.sqrt(dX * dX + dY * dY);
    this.frequencyHz = 0;
    this.dampingRatio = 0;
  }
}

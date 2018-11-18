import Vec2 from '../../common/math/vec2';
import Body from '../body';

import JointDef from './joint-def';
import Joint from './joint';

export default class WeldJointDef extends JointDef {
  public type = Joint.e_weldJoint;

  public localAnchorA = new Vec2();
  public localAnchorB = new Vec2();

  public referenceAngle = 0;

  public Initialize(bodyA: Body, bodyB: Body, anchor: Vec2) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;

    this.localAnchorA.SetV(this.bodyA.GetLocalPoint(anchor));
    this.localAnchorB.SetV(this.bodyB.GetLocalPoint(anchor));

    this.referenceAngle = this.bodyB.GetAngle() - this.bodyA.GetAngle();
  }
}

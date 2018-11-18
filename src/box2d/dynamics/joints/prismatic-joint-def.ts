import Vec2 from '../../common/math/vec2';
import Body from '../body';

import JointDef from './joint-def';
import Joint from './joint';

export default class PrismaticJointDef extends JointDef {
  public type = Joint.e_prismaticJoint;

  public localAnchorA = new Vec2();
  public localAnchorB = new Vec2();
  public localAxisA = new Vec2(1, 0);

  public referenceAngle = 0;
  public enableLimit = false;
  public lowerTranslation = 0;
  public upperTranslation = 0;
  public enableMotor = false;
  public maxMotorForce = 0;
  public motorSpeed = 0;

  public Initialize(bodyA: Body, bodyB: Body, anchor: Vec2, axis: Vec2) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;

    this.localAnchorB.SetV(this.bodyB.GetLocalPoint(anchor));
    this.localAnchorA.SetV(this.bodyA.GetLocalPoint(anchor));
    this.localAxisA.SetV(this.bodyA.GetLocalVector(axis));

    this.referenceAngle = this.bodyB.GetAngle() - this.bodyA.GetAngle();
  }
}

import Vec2 from '../../common/math/vec2';
import Body from '../body';

import JointDef from './joint-def';
import Joint from './joint';
import PulleyJoint from './pulley-joint';

export default class PulleyJointDef extends JointDef {
  public type = Joint.e_pulleyJoint;

  public localAnchorA = new Vec2(-1, 0);
  public localAnchorB = new Vec2(1, 0);

  public groundAnchorA = new Vec2(-1, 1);
  public groundAnchorB = new Vec2(1, 1);

  public lengthA = 0;
  public maxLengthA = 0;
  public lengthB = 0;
  public maxLengthB = 0;
  public ratio = 1;
  public collideConnected = true;

  public Initialize(
    bodyA: Body,
    bodyB: Body,
    groundAnchorA: Vec2,
    groundAnchorB: Vec2,
    anchorA: Vec2,
    anchorB: Vec2,
    ratio = 0,
  ) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;

    this.groundAnchorA.SetV(groundAnchorA);
    this.groundAnchorB.SetV(groundAnchorB);

    this.localAnchorA.SetV(this.bodyA.GetLocalPoint(anchorA));
    this.localAnchorB.SetV(this.bodyB.GetLocalPoint(anchorB));

    const d1X = anchorA.x - groundAnchorA.x;
    const d1Y = anchorA.y - groundAnchorA.y;
    this.lengthA = Math.sqrt(d1X * d1X + d1Y * d1Y);

    const d2X = anchorB.x - groundAnchorB.x;
    const d2Y = anchorB.y - groundAnchorB.y;
    this.lengthB = Math.sqrt(d2X * d2X + d2Y * d2Y);

    this.ratio = ratio;

    const C = this.lengthA + this.ratio * this.lengthB;
    this.maxLengthA = C - this.ratio * PulleyJoint.b2_minPulleyLength;
    this.maxLengthB = (C - PulleyJoint.b2_minPulleyLength) / this.ratio;
  }
}

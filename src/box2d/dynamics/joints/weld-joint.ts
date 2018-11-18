// tslint:disable variable-name

import Joint from './joint';
import Vec2 from '../../common/math/vec2';
import Vec3 from '../../common/math/vec3';
import Mat33 from '../../common/math/mat33';
import WeldJointDef from './weld-joint-def';
import TimeStep from '../time-step';
import Body from '../body';
import { b2_linearSlop, b2_angularSlop } from '../../common/settings';
import { Abs } from '../../common/math';

export default class WeldJoint extends Joint {
  public m_localAnchorA = new Vec2();
  public m_localAnchorB = new Vec2();

  public m_impulse = new Vec3();
  public m_mass = new Mat33();
  public m_referenceAngle = 0;

  constructor(def: WeldJointDef) {
    super(def);
    this.m_localAnchorA.SetV(def.localAnchorA);
    this.m_localAnchorB.SetV(def.localAnchorB);
    this.m_referenceAngle = def.referenceAngle;
  }

  public GetAnchorA() {
    if (!this.m_bodyA) {
      return this.m_localAnchorA.Copy();
    }

    return this.m_bodyA.GetWorldPoint(this.m_localAnchorA);
  }

  public GetAnchorB() {
    if (!this.m_bodyB) {
      return this.m_localAnchorB.Copy();
    }

    return this.m_bodyB.GetWorldPoint(this.m_localAnchorB);
  }

  public GetReactionForce(inv_dt = 0) {
    return new Vec2(inv_dt * this.m_impulse.x, inv_dt * this.m_impulse.y);
  }

  public GetReactionTorque(inv_dt = 0) {
    return inv_dt * this.m_impulse.z;
  }

  public InitVelocityConstraints(step: TimeStep) {
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    let tX = 0;
    let tMat = bA.m_xf.R;
    let rAX = this.m_localAnchorA.x - bA.m_sweep.localCenter.x;
    let rAY = this.m_localAnchorA.y - bA.m_sweep.localCenter.y;

    tX = tMat.col1.x * rAX + tMat.col2.x * rAY;
    rAY = tMat.col1.y * rAX + tMat.col2.y * rAY;
    rAX = tX;
    tMat = bB.m_xf.R;

    let rBX = this.m_localAnchorB.x - bB.m_sweep.localCenter.x;
    let rBY = this.m_localAnchorB.y - bB.m_sweep.localCenter.y;

    tX = tMat.col1.x * rBX + tMat.col2.x * rBY;
    rBY = tMat.col1.y * rBX + tMat.col2.y * rBY;
    rBX = tX;

    const mA = bA.m_invMass;
    const mB = bB.m_invMass;

    const iA = bA.m_invI;
    const iB = bB.m_invI;

    this.m_mass.col1.x = mA + mB + rAY * rAY * iA + rBY * rBY * iB;
    this.m_mass.col2.x = -rAY * rAX * iA - rBY * rBX * iB;
    this.m_mass.col3.x = -rAY * iA - rBY * iB;

    this.m_mass.col1.y = this.m_mass.col2.x;
    this.m_mass.col2.y = mA + mB + rAX * rAX * iA + rBX * rBX * iB;
    this.m_mass.col3.y = rAX * iA + rBX * iB;

    this.m_mass.col1.z = this.m_mass.col3.x;
    this.m_mass.col2.z = this.m_mass.col3.y;
    this.m_mass.col3.z = iA + iB;

    if (step.warmStarting) {
      this.m_impulse.x *= step.dtRatio;
      this.m_impulse.y *= step.dtRatio;
      this.m_impulse.z *= step.dtRatio;

      bA.m_linearVelocity.x -= mA * this.m_impulse.x;
      bA.m_linearVelocity.y -= mA * this.m_impulse.y;

      bA.m_angularVelocity -=
        iA *
        (rAX * this.m_impulse.y - rAY * this.m_impulse.x + this.m_impulse.z);

      bB.m_linearVelocity.x += mB * this.m_impulse.x;
      bB.m_linearVelocity.y += mB * this.m_impulse.y;
      bB.m_angularVelocity +=
        iB *
        (rBX * this.m_impulse.y - rBY * this.m_impulse.x + this.m_impulse.z);
    } else {
      this.m_impulse.SetZero();
    }
  }

  public SolveVelocityConstraints(step: TimeStep) {
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    const vA = bA.m_linearVelocity;
    let wA = bA.m_angularVelocity;

    const vB = bB.m_linearVelocity;
    let wB = bB.m_angularVelocity;

    const mA = bA.m_invMass;
    const mB = bB.m_invMass;

    const iA = bA.m_invI;
    const iB = bB.m_invI;

    let tX = 0;
    let tMat = bA.m_xf.R;
    let rAX = this.m_localAnchorA.x - bA.m_sweep.localCenter.x;
    let rAY = this.m_localAnchorA.y - bA.m_sweep.localCenter.y;

    tX = tMat.col1.x * rAX + tMat.col2.x * rAY;
    rAY = tMat.col1.y * rAX + tMat.col2.y * rAY;
    rAX = tX;
    tMat = bB.m_xf.R;

    let rBX = this.m_localAnchorB.x - bB.m_sweep.localCenter.x;
    let rBY = this.m_localAnchorB.y - bB.m_sweep.localCenter.y;

    tX = tMat.col1.x * rBX + tMat.col2.x * rBY;
    rBY = tMat.col1.y * rBX + tMat.col2.y * rBY;
    rBX = tX;

    const Cdot1X = vB.x - wB * rBY - vA.x + wA * rAY;
    const Cdot1Y = vB.y + wB * rBX - vA.y - wA * rAX;
    const Cdot2 = wB - wA;

    const impulse = new Vec3();

    this.m_mass.Solve33(impulse, -Cdot1X, -Cdot1Y, -Cdot2);
    this.m_impulse.Add(impulse);

    vA.x -= mA * impulse.x;
    vA.y -= mA * impulse.y;
    wA -= iA * (rAX * impulse.y - rAY * impulse.x + impulse.z);

    vB.x += mB * impulse.x;
    vB.y += mB * impulse.y;
    wB += iB * (rBX * impulse.y - rBY * impulse.x + impulse.z);

    bA.m_angularVelocity = wA;
    bB.m_angularVelocity = wB;
  }

  public SolvePositionConstraints(baumgarte = 0) {
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    let tX = 0;
    let tMat = bA.m_xf.R;

    let rAX = this.m_localAnchorA.x - bA.m_sweep.localCenter.x;
    let rAY = this.m_localAnchorA.y - bA.m_sweep.localCenter.y;

    tX = tMat.col1.x * rAX + tMat.col2.x * rAY;
    rAY = tMat.col1.y * rAX + tMat.col2.y * rAY;
    rAX = tX;
    tMat = bB.m_xf.R;

    let rBX = this.m_localAnchorB.x - bB.m_sweep.localCenter.x;
    let rBY = this.m_localAnchorB.y - bB.m_sweep.localCenter.y;

    tX = tMat.col1.x * rBX + tMat.col2.x * rBY;
    rBY = tMat.col1.y * rBX + tMat.col2.y * rBY;
    rBX = tX;

    const mA = bA.m_invMass;
    const mB = bB.m_invMass;

    let iA = bA.m_invI;
    let iB = bB.m_invI;

    const C1X = bB.m_sweep.c.x + rBX - bA.m_sweep.c.x - rAX;
    const C1Y = bB.m_sweep.c.y + rBY - bA.m_sweep.c.y - rAY;

    const C2 = bB.m_sweep.a - bA.m_sweep.a - this.m_referenceAngle;

    const k_allowedStretch = 10.0 * b2_linearSlop;
    const positionError = Math.sqrt(C1X * C1X + C1Y * C1Y);
    const angularError = Abs(C2);

    if (positionError > k_allowedStretch) {
      iA *= 1.0;
      iB *= 1.0;
    }

    this.m_mass.col1.x = mA + mB + rAY * rAY * iA + rBY * rBY * iB;
    this.m_mass.col2.x = -rAY * rAX * iA - rBY * rBX * iB;
    this.m_mass.col3.x = -rAY * iA - rBY * iB;

    this.m_mass.col1.y = this.m_mass.col2.x;
    this.m_mass.col2.y = mA + mB + rAX * rAX * iA + rBX * rBX * iB;
    this.m_mass.col3.y = rAX * iA + rBX * iB;

    this.m_mass.col1.z = this.m_mass.col3.x;
    this.m_mass.col2.z = this.m_mass.col3.y;
    this.m_mass.col3.z = iA + iB;

    const impulse = new Vec3();
    this.m_mass.Solve33(impulse, -C1X, -C1Y, -C2);

    bA.m_sweep.c.x -= mA * impulse.x;
    bA.m_sweep.c.y -= mA * impulse.y;
    bA.m_sweep.a -= iA * (rAX * impulse.y - rAY * impulse.x + impulse.z);

    bB.m_sweep.c.x += mB * impulse.x;
    bB.m_sweep.c.y += mB * impulse.y;
    bB.m_sweep.a += iB * (rBX * impulse.y - rBY * impulse.x + impulse.z);

    bA.SynchronizeTransform();
    bB.SynchronizeTransform();

    return positionError <= b2_linearSlop && angularError <= b2_angularSlop;
  }
}

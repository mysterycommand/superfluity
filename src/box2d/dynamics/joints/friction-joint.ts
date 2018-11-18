// tslint:disable variable-name

import Joint from './joint';
import FrictionJointDef from './friction-joint-def';
import Vec2 from '../../common/math/vec2';
import Mat22 from '../../common/math/mat22';
import TimeStep from '../time-step';
import Body from '../body';
import { Clamp, MulMV, SubtractVV } from '../../common/math';

export default class FrictionJoint extends Joint {
  public m_localAnchorA = new Vec2();
  public m_localAnchorB = new Vec2();

  public m_linearMass = new Mat22();
  public m_linearImpulse = new Vec2();

  public m_angularMass = 0;
  public m_angularImpulse = 0;
  public m_maxForce = 0;
  public m_maxTorque = 0;

  constructor(def: FrictionJointDef) {
    super(def);

    this.m_localAnchorA.SetV(def.localAnchorA);
    this.m_localAnchorB.SetV(def.localAnchorB);

    this.m_maxForce = def.maxForce;
    this.m_maxTorque = def.maxTorque;
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
    return new Vec2(
      inv_dt * this.m_linearImpulse.x,
      inv_dt * this.m_linearImpulse.y,
    );
  }

  public GetReactionTorque(inv_dt = 0) {
    return inv_dt * this.m_angularImpulse;
  }

  public SetMaxForce(force = 0) {
    this.m_maxForce = force;
  }

  public GetMaxForce() {
    return this.m_maxForce;
  }

  public SetMaxTorque(torque = 0) {
    this.m_maxTorque = torque;
  }

  public GetMaxTorque() {
    return this.m_maxTorque;
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

    const K = new Mat22();

    K.col1.x = mA + mB;
    K.col2.x = 0;

    K.col1.y = 0;
    K.col2.y = mA + mB;

    K.col1.x += iA * rAY * rAY;
    K.col2.x += -iA * rAX * rAY;

    K.col1.y += -iA * rAX * rAY;
    K.col2.y += iA * rAX * rAX;

    K.col1.x += iB * rBY * rBY;
    K.col2.x += -iB * rBX * rBY;

    K.col1.y += -iB * rBX * rBY;
    K.col2.y += iB * rBX * rBX;

    K.GetInverse(this.m_linearMass);
    this.m_angularMass = iA + iB;

    if (this.m_angularMass > 0) {
      this.m_angularMass = 1 / this.m_angularMass;
    }

    if (step.warmStarting) {
      this.m_linearImpulse.x *= step.dtRatio;
      this.m_linearImpulse.y *= step.dtRatio;
      this.m_angularImpulse *= step.dtRatio;

      const P = this.m_linearImpulse;

      bA.m_linearVelocity.x -= mA * P.x;
      bA.m_linearVelocity.y -= mA * P.y;
      bA.m_angularVelocity -=
        iA * (rAX * P.y - rAY * P.x + this.m_angularImpulse);

      bB.m_linearVelocity.x += mB * P.x;
      bB.m_linearVelocity.y += mB * P.y;
      bB.m_angularVelocity +=
        iB * (rBX * P.y - rBY * P.x + this.m_angularImpulse);
    } else {
      this.m_linearImpulse.SetZero();
      this.m_angularImpulse = 0;
    }
  }

  public SolveVelocityConstraints(step: TimeStep) {
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    let tX = 0;
    let tMat = bA.m_xf.R;

    const vA = bA.m_linearVelocity;
    let wA = bA.m_angularVelocity;

    const vB = bB.m_linearVelocity;
    let wB = bB.m_angularVelocity;

    const mA = bA.m_invMass;
    const mB = bB.m_invMass;

    const iA = bA.m_invI;
    const iB = bB.m_invI;

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

    let maxImpulse = 0;
    {
      const Cdot = wB - wA;
      let impulse = -this.m_angularMass * Cdot;
      const oldImpulse = this.m_angularImpulse;

      maxImpulse = step.dt * this.m_maxTorque;

      this.m_angularImpulse = Clamp(
        this.m_angularImpulse + impulse,
        -maxImpulse,
        maxImpulse,
      );

      impulse = this.m_angularImpulse - oldImpulse;
      wA -= iA * impulse;
      wB += iB * impulse;
    }
    {
      const CdotX = vB.x - wB * rBY - vA.x + wA * rAY;
      const CdotY = vB.y + wB * rBX - vA.y - wA * rAX;

      const impulseV = MulMV(this.m_linearMass, new Vec2(-CdotX, -CdotY));

      const oldImpulseV = this.m_linearImpulse.Copy();
      this.m_linearImpulse.Add(impulseV);
      maxImpulse = step.dt * this.m_maxForce;

      if (this.m_linearImpulse.LengthSquared() > maxImpulse * maxImpulse) {
        this.m_linearImpulse.Normalize();
        this.m_linearImpulse.Multiply(maxImpulse);
      }

      impulseV.SetV(SubtractVV(this.m_linearImpulse, oldImpulseV));

      vA.x -= mA * impulseV.x;
      vA.y -= mA * impulseV.y;
      wA -= iA * (rAX * impulseV.y - rAY * impulseV.x);

      vB.x += mB * impulseV.x;
      vB.y += mB * impulseV.y;
      wB += iB * (rBX * impulseV.y - rBY * impulseV.x);
    }

    bA.m_angularVelocity = wA;
    bB.m_angularVelocity = wB;
  }

  public SolvePositionConstraints(baumgarte = 0) {
    return true;
  }
}

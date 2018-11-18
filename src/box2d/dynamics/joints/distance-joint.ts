// tslint:disable variable-name

import Joint from './joint';
import DistanceJointDef from './distance-joint-def';
import Vec2 from '../../common/math/vec2';
import TimeStep from '../time-step';
import Body from '../body';
import { b2_linearSlop, b2_maxLinearCorrection } from '../../common/settings';
import { Clamp, Abs } from '../../common/math';

export default class DistanceJoint extends Joint {
  public m_localAnchorA = new Vec2();
  public m_localAnchorB = new Vec2();
  public m_u = new Vec2();

  public m_length = 0;
  public m_frequencyHz = 0;
  public m_dampingRatio = 0;

  public m_impulse = 0;
  public m_gamma = 0;
  public m_bias = 0;
  public m_mass = 0;

  constructor(def: DistanceJointDef) {
    super(def);
    this.m_localAnchorA.SetV(def.localAnchorA);
    this.m_localAnchorB.SetV(def.localAnchorB);
    this.m_length = def.length;
    this.m_frequencyHz = def.frequencyHz;
    this.m_dampingRatio = def.dampingRatio;
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
      inv_dt * this.m_impulse * this.m_u.x,
      inv_dt * this.m_impulse * this.m_u.y,
    );
  }

  public GetReactionTorque(inv_dt = 0) {
    return 0;
  }

  public GetLength() {
    return this.m_length;
  }

  public SetLength(length = 0) {
    this.m_length = length;
  }

  public GetFrequency() {
    return this.m_frequencyHz;
  }

  public SetFrequency(hz = 0) {
    this.m_frequencyHz = hz;
  }

  public GetDampingRatio() {
    return this.m_dampingRatio;
  }

  public SetDampingRatio(ratio = 0) {
    this.m_dampingRatio = ratio;
  }

  public InitVelocityConstraints(step: TimeStep) {
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    let tX = 0;
    let tMat = bA.m_xf.R;

    let r1X = this.m_localAnchorA.x - bA.m_sweep.localCenter.x;
    let r1Y = this.m_localAnchorA.y - bA.m_sweep.localCenter.y;

    tX = tMat.col1.x * r1X + tMat.col2.x * r1Y;
    r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
    r1X = tX;
    tMat = bB.m_xf.R;

    let r2X = this.m_localAnchorB.x - bB.m_sweep.localCenter.x;
    let r2Y = this.m_localAnchorB.y - bB.m_sweep.localCenter.y;

    tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
    r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
    r2X = tX;

    this.m_u.x = bB.m_sweep.c.x + r2X - bA.m_sweep.c.x - r1X;
    this.m_u.y = bB.m_sweep.c.y + r2Y - bA.m_sweep.c.y - r1Y;

    const length = Math.hypot(this.m_u.x, this.m_u.y);
    if (length > b2_linearSlop) {
      this.m_u.Multiply(1 / length);
    } else {
      this.m_u.SetZero();
    }

    const cr1u = r1X * this.m_u.y - r1Y * this.m_u.x;
    const cr2u = r2X * this.m_u.y - r2Y * this.m_u.x;

    const invMass =
      bA.m_invMass +
      bA.m_invI * cr1u * cr1u +
      bB.m_invMass +
      bB.m_invI * cr2u * cr2u;

    this.m_mass = invMass !== 0 ? 1 / invMass : 0;
    if (this.m_frequencyHz > 0) {
      const C = length - this.m_length;
      const omega = 2 * Math.PI * this.m_frequencyHz;
      const d = 2 * this.m_mass * this.m_dampingRatio * omega;
      const k = this.m_mass * omega * omega;

      this.m_gamma = step.dt * (d + step.dt * k);
      this.m_gamma = this.m_gamma !== 0 ? 1 / this.m_gamma : 0;

      this.m_bias = C * step.dt * k * this.m_gamma;

      this.m_mass = invMass + this.m_gamma;
      this.m_mass = this.m_mass !== 0 ? 1 / this.m_mass : 0;
    }

    if (step.warmStarting) {
      this.m_impulse *= step.dtRatio;

      const PX = this.m_impulse * this.m_u.x;
      const PY = this.m_impulse * this.m_u.y;

      bA.m_linearVelocity.x -= bA.m_invMass * PX;
      bA.m_linearVelocity.y -= bA.m_invMass * PY;
      bA.m_angularVelocity -= bA.m_invI * (r1X * PY - r1Y * PX);

      bB.m_linearVelocity.x += bB.m_invMass * PX;
      bB.m_linearVelocity.y += bB.m_invMass * PY;
      bB.m_angularVelocity += bB.m_invI * (r2X * PY - r2Y * PX);
    } else {
      this.m_impulse = 0;
    }
  }

  public SolveVelocityConstraints(step: TimeStep) {
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    let tMat = bA.m_xf.R;
    let r1X = this.m_localAnchorA.x - bA.m_sweep.localCenter.x;
    let r1Y = this.m_localAnchorA.y - bA.m_sweep.localCenter.y;
    let tX = tMat.col1.x * r1X + tMat.col2.x * r1Y;

    r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
    r1X = tX;
    tMat = bB.m_xf.R;

    let r2X = this.m_localAnchorB.x - bB.m_sweep.localCenter.x;
    let r2Y = this.m_localAnchorB.y - bB.m_sweep.localCenter.y;

    tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
    r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
    r2X = tX;

    const v1X = bA.m_linearVelocity.x + -bA.m_angularVelocity * r1Y;
    const v1Y = bA.m_linearVelocity.y + bA.m_angularVelocity * r1X;

    const v2X = bB.m_linearVelocity.x + -bB.m_angularVelocity * r2Y;
    const v2Y = bB.m_linearVelocity.y + bB.m_angularVelocity * r2X;

    const Cdot = this.m_u.x * (v2X - v1X) + this.m_u.y * (v2Y - v1Y);
    const impulse =
      -this.m_mass * (Cdot + this.m_bias + this.m_gamma * this.m_impulse);

    this.m_impulse += impulse;

    const PX = impulse * this.m_u.x;
    const PY = impulse * this.m_u.y;

    bA.m_linearVelocity.x -= bA.m_invMass * PX;
    bA.m_linearVelocity.y -= bA.m_invMass * PY;
    bA.m_angularVelocity -= bA.m_invI * (r1X * PY - r1Y * PX);

    bB.m_linearVelocity.x += bB.m_invMass * PX;
    bB.m_linearVelocity.y += bB.m_invMass * PY;
    bB.m_angularVelocity += bB.m_invI * (r2X * PY - r2Y * PX);
  }

  public SolvePositionConstraints(baumgarte = 0) {
    if (this.m_frequencyHz > 0.0) {
      return true;
    }

    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    let tMat = bA.m_xf.R;
    let r1X = this.m_localAnchorA.x - bA.m_sweep.localCenter.x;
    let r1Y = this.m_localAnchorA.y - bA.m_sweep.localCenter.y;
    let tX = tMat.col1.x * r1X + tMat.col2.x * r1Y;

    r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
    r1X = tX;
    tMat = bB.m_xf.R;

    let r2X = this.m_localAnchorB.x - bB.m_sweep.localCenter.x;
    let r2Y = this.m_localAnchorB.y - bB.m_sweep.localCenter.y;

    tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
    r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
    r2X = tX;

    let dX = bB.m_sweep.c.x + r2X - bA.m_sweep.c.x - r1X;
    let dY = bB.m_sweep.c.y + r2Y - bA.m_sweep.c.y - r1Y;
    const length = Math.hypot(dX, dY);

    dX /= length;
    dY /= length;

    let C = length - this.m_length;
    C = Clamp(C, -b2_maxLinearCorrection, b2_maxLinearCorrection);

    const impulse = -this.m_mass * C;
    this.m_u.Set(dX, dY);

    const PX = impulse * this.m_u.x;
    const PY = impulse * this.m_u.y;

    bA.m_sweep.c.x -= bA.m_invMass * PX;
    bA.m_sweep.c.y -= bA.m_invMass * PY;
    bA.m_sweep.a -= bA.m_invI * (r1X * PY - r1Y * PX);

    bB.m_sweep.c.x += bB.m_invMass * PX;
    bB.m_sweep.c.y += bB.m_invMass * PY;
    bB.m_sweep.a += bB.m_invI * (r2X * PY - r2Y * PX);

    bA.SynchronizeTransform();
    bB.SynchronizeTransform();

    return Abs(C) < b2_linearSlop;
  }
}

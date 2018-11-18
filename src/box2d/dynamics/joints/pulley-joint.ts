// tslint:disable variable-name

import Joint from './joint';
import PulleyJointDef from './pulley-joint-def';
import Vec2 from '../../common/math/vec2';
import Body from '../body';
import { Min, Max, Clamp } from '../../common/math';
import TimeStep from '../time-step';
import { b2_linearSlop, b2_maxLinearCorrection } from '../../common/settings';

export default class PulleyJoint extends Joint {
  public static b2_minPulleyLength = 2;

  public m_groundAnchorA = new Vec2();
  public m_groundAnchorB = new Vec2();

  public m_localAnchorA = new Vec2();
  public m_localAnchorB = new Vec2();

  public m_u1 = new Vec2();
  public m_u2 = new Vec2();

  public m_ground?: Body;

  public m_impulse = 0;
  public m_pulleyMass = 0;

  public m_limitStateA = Joint.e_inactiveLimit;
  public m_limitImpulseA = 0;
  public m_limitMassA = 0;

  public m_limitStateB = Joint.e_inactiveLimit;
  public m_limitImpulseB = 0;
  public m_limitMassB = 0;

  public m_ratio = 0;
  public m_constant = 0;
  public m_maxLengthA = 0;
  public m_maxLengthB = 0;

  public m_state = Joint.e_inactiveLimit;

  constructor(def: PulleyJointDef) {
    super(def);

    if (
      !(
        this.m_bodyA &&
        this.m_bodyA.m_world &&
        this.m_bodyA.m_world.m_groundBody
      )
    ) {
      return;
    }

    this.m_ground = this.m_bodyA.m_world.m_groundBody;

    this.m_groundAnchorA.x =
      def.groundAnchorA.x - this.m_ground.m_xf.position.x;
    this.m_groundAnchorA.y =
      def.groundAnchorA.y - this.m_ground.m_xf.position.y;

    this.m_groundAnchorB.x =
      def.groundAnchorB.x - this.m_ground.m_xf.position.x;
    this.m_groundAnchorB.y =
      def.groundAnchorB.y - this.m_ground.m_xf.position.y;

    this.m_localAnchorA.SetV(def.localAnchorA);
    this.m_localAnchorB.SetV(def.localAnchorB);

    this.m_ratio = def.ratio;
    this.m_constant = def.lengthA + this.m_ratio * def.lengthB;

    this.m_maxLengthA = Min(
      def.maxLengthA,
      this.m_constant - this.m_ratio * PulleyJoint.b2_minPulleyLength,
    );

    this.m_maxLengthB = Min(
      def.maxLengthB,
      (this.m_constant - PulleyJoint.b2_minPulleyLength) / this.m_ratio,
    );
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
      inv_dt * this.m_impulse * this.m_u2.x,
      inv_dt * this.m_impulse * this.m_u2.y,
    );
  }

  public GetReactionTorque(inv_dt = 0) {
    return 0;
  }

  public GetGroundAnchorA() {
    if (!this.m_ground) {
      return this.m_groundAnchorA.Copy();
    }

    const a = this.m_ground.m_xf.position.Copy();
    a.Add(this.m_groundAnchorA);
    return a;
  }

  public GetGroundAnchorB() {
    if (!this.m_ground) {
      return this.m_groundAnchorB.Copy();
    }

    const a = this.m_ground.m_xf.position.Copy();
    a.Add(this.m_groundAnchorB);
    return a;
  }

  public GetLength1() {
    if (!(this.m_ground && this.m_bodyA)) {
      return this.m_groundAnchorA.Copy();
    }

    const p = this.m_bodyA.GetWorldPoint(this.m_localAnchorA);

    const sX = this.m_ground.m_xf.position.x + this.m_groundAnchorA.x;
    const sY = this.m_ground.m_xf.position.y + this.m_groundAnchorA.y;

    const dX = p.x - sX;
    const dY = p.y - sY;

    return Math.hypot(dX, dY);
  }

  public GetLength2() {
    if (!(this.m_ground && this.m_bodyB)) {
      return this.m_groundAnchorA.Copy();
    }

    const p = this.m_bodyB.GetWorldPoint(this.m_localAnchorB);

    const sX = this.m_ground.m_xf.position.x + this.m_groundAnchorB.x;
    const sY = this.m_ground.m_xf.position.y + this.m_groundAnchorB.y;

    const dX = p.x - sX;
    const dY = p.y - sY;

    return Math.hypot(dX, dY);
  }

  public GetRatio() {
    return this.m_ratio;
  }

  public InitVelocityConstraints(step: TimeStep) {
    const g = this.m_ground as Body;
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

    const p1X = bA.m_sweep.c.x + r1X;
    const p1Y = bA.m_sweep.c.y + r1Y;

    const p2X = bB.m_sweep.c.x + r2X;
    const p2Y = bB.m_sweep.c.y + r2Y;

    const s1X = g.m_xf.position.x + this.m_groundAnchorA.x;
    const s1Y = g.m_xf.position.y + this.m_groundAnchorA.y;

    const s2X = g.m_xf.position.x + this.m_groundAnchorB.x;
    const s2Y = g.m_xf.position.y + this.m_groundAnchorB.y;

    this.m_u1.Set(p1X - s1X, p1Y - s1Y);
    this.m_u2.Set(p2X - s2X, p2Y - s2Y);

    const length1 = this.m_u1.Length();
    const length2 = this.m_u2.Length();

    if (length1 > b2_linearSlop) {
      this.m_u1.Multiply(1.0 / length1);
    } else {
      this.m_u1.SetZero();
    }

    if (length2 > b2_linearSlop) {
      this.m_u2.Multiply(1.0 / length2);
    } else {
      this.m_u2.SetZero();
    }

    const C = this.m_constant - length1 - this.m_ratio * length2;
    if (C > 0.0) {
      this.m_state = Joint.e_inactiveLimit;
      this.m_impulse = 0.0;
    } else {
      this.m_state = Joint.e_atUpperLimit;
    }

    if (length1 < this.m_maxLengthA) {
      this.m_limitStateA = Joint.e_inactiveLimit;
      this.m_limitImpulseA = 0;
    } else {
      this.m_limitStateA = Joint.e_atUpperLimit;
    }

    if (length2 < this.m_maxLengthB) {
      this.m_limitStateB = Joint.e_inactiveLimit;
      this.m_limitImpulseB = 0.0;
    } else {
      this.m_limitStateB = Joint.e_atUpperLimit;
    }

    const cr1u1 = r1X * this.m_u1.y - r1Y * this.m_u1.x;
    const cr2u2 = r2X * this.m_u2.y - r2Y * this.m_u2.x;

    this.m_limitMassA = bA.m_invMass + bA.m_invI * cr1u1 * cr1u1;
    this.m_limitMassB = bB.m_invMass + bB.m_invI * cr2u2 * cr2u2;
    this.m_pulleyMass =
      this.m_limitMassA + this.m_ratio * this.m_ratio * this.m_limitMassB;

    this.m_limitMassA = 1.0 / this.m_limitMassA;
    this.m_limitMassB = 1.0 / this.m_limitMassB;
    this.m_pulleyMass = 1.0 / this.m_pulleyMass;

    if (step.warmStarting) {
      this.m_impulse *= step.dtRatio;
      this.m_limitImpulseA *= step.dtRatio;
      this.m_limitImpulseB *= step.dtRatio;

      const P1X = (-this.m_impulse - this.m_limitImpulseA) * this.m_u1.x;
      const P1Y = (-this.m_impulse - this.m_limitImpulseA) * this.m_u1.y;

      const P2X =
        (-this.m_ratio * this.m_impulse - this.m_limitImpulseB) * this.m_u2.x;
      const P2Y =
        (-this.m_ratio * this.m_impulse - this.m_limitImpulseB) * this.m_u2.y;

      bA.m_linearVelocity.x += bA.m_invMass * P1X;
      bA.m_linearVelocity.y += bA.m_invMass * P1Y;
      bA.m_angularVelocity += bA.m_invI * (r1X * P1Y - r1Y * P1X);

      bB.m_linearVelocity.x += bB.m_invMass * P2X;
      bB.m_linearVelocity.y += bB.m_invMass * P2Y;
      bB.m_angularVelocity += bB.m_invI * (r2X * P2Y - r2Y * P2X);
    } else {
      this.m_impulse = 0.0;
      this.m_limitImpulseA = 0.0;
      this.m_limitImpulseB = 0.0;
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

    let v1X = 0;
    let v1Y = 0;

    let v2X = 0;
    let v2Y = 0;

    let P1X = 0;
    let P1Y = 0;

    let P2X = 0;
    let P2Y = 0;

    let Cdot = 0;
    let impulse = 0;
    let oldImpulse = 0;

    if (this.m_state === Joint.e_atUpperLimit) {
      v1X = bA.m_linearVelocity.x + -bA.m_angularVelocity * r1Y;
      v1Y = bA.m_linearVelocity.y + bA.m_angularVelocity * r1X;

      v2X = bB.m_linearVelocity.x + -bB.m_angularVelocity * r2Y;
      v2Y = bB.m_linearVelocity.y + bB.m_angularVelocity * r2X;

      Cdot =
        -(this.m_u1.x * v1X + this.m_u1.y * v1Y) -
        this.m_ratio * (this.m_u2.x * v2X + this.m_u2.y * v2Y);

      impulse = this.m_pulleyMass * -Cdot;
      oldImpulse = this.m_impulse;
      this.m_impulse = Max(0.0, this.m_impulse + impulse);
      impulse = this.m_impulse - oldImpulse;

      P1X = -impulse * this.m_u1.x;
      P1Y = -impulse * this.m_u1.y;

      P2X = -this.m_ratio * impulse * this.m_u2.x;
      P2Y = -this.m_ratio * impulse * this.m_u2.y;

      bA.m_linearVelocity.x += bA.m_invMass * P1X;
      bA.m_linearVelocity.y += bA.m_invMass * P1Y;
      bA.m_angularVelocity += bA.m_invI * (r1X * P1Y - r1Y * P1X);

      bB.m_linearVelocity.x += bB.m_invMass * P2X;
      bB.m_linearVelocity.y += bB.m_invMass * P2Y;
      bB.m_angularVelocity += bB.m_invI * (r2X * P2Y - r2Y * P2X);
    }
    if (this.m_limitStateA === Joint.e_atUpperLimit) {
      v1X = bA.m_linearVelocity.x + -bA.m_angularVelocity * r1Y;
      v1Y = bA.m_linearVelocity.y + bA.m_angularVelocity * r1X;

      Cdot = -(this.m_u1.x * v1X + this.m_u1.y * v1Y);

      impulse = -this.m_limitMassA * Cdot;
      oldImpulse = this.m_limitImpulseA;
      this.m_limitImpulseA = Max(0.0, this.m_limitImpulseA + impulse);
      impulse = this.m_limitImpulseA - oldImpulse;

      P1X = -impulse * this.m_u1.x;
      P1Y = -impulse * this.m_u1.y;

      bA.m_linearVelocity.x += bA.m_invMass * P1X;
      bA.m_linearVelocity.y += bA.m_invMass * P1Y;
      bA.m_angularVelocity += bA.m_invI * (r1X * P1Y - r1Y * P1X);
    }
    if (this.m_limitStateB === Joint.e_atUpperLimit) {
      v2X = bB.m_linearVelocity.x + -bB.m_angularVelocity * r2Y;
      v2Y = bB.m_linearVelocity.y + bB.m_angularVelocity * r2X;

      Cdot = -(this.m_u2.x * v2X + this.m_u2.y * v2Y);

      impulse = -this.m_limitMassB * Cdot;
      oldImpulse = this.m_limitImpulseB;
      this.m_limitImpulseB = Max(0.0, this.m_limitImpulseB + impulse);
      impulse = this.m_limitImpulseB - oldImpulse;

      P2X = -impulse * this.m_u2.x;
      P2Y = -impulse * this.m_u2.y;

      bB.m_linearVelocity.x += bB.m_invMass * P2X;
      bB.m_linearVelocity.y += bB.m_invMass * P2Y;
      bB.m_angularVelocity += bB.m_invI * (r2X * P2Y - r2Y * P2X);
    }
  }

  public SolvePositionConstraints(baumgarte = 0) {
    const g = this.m_ground as Body;
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    let tMat;

    const s1X = g.m_xf.position.x + this.m_groundAnchorA.x;
    const s1Y = g.m_xf.position.y + this.m_groundAnchorA.y;

    const s2X = g.m_xf.position.x + this.m_groundAnchorB.x;
    const s2Y = g.m_xf.position.y + this.m_groundAnchorB.y;

    let r1X = 0;
    let r1Y = 0;

    let r2X = 0;
    let r2Y = 0;

    let p1X = 0;
    let p1Y = 0;

    let p2X = 0;
    let p2Y = 0;

    let length1 = 0;
    let length2 = 0;

    let C = 0;
    let impulse = 0;

    let tX = 0;
    let linearError = 0.0;

    if (this.m_state === Joint.e_atUpperLimit) {
      tMat = bA.m_xf.R;
      r1X = this.m_localAnchorA.x - bA.m_sweep.localCenter.x;
      r1Y = this.m_localAnchorA.y - bA.m_sweep.localCenter.y;

      tX = tMat.col1.x * r1X + tMat.col2.x * r1Y;
      r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
      r1X = tX;

      tMat = bB.m_xf.R;
      r2X = this.m_localAnchorB.x - bB.m_sweep.localCenter.x;
      r2Y = this.m_localAnchorB.y - bB.m_sweep.localCenter.y;

      tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
      r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
      r2X = tX;

      p1X = bA.m_sweep.c.x + r1X;
      p1Y = bA.m_sweep.c.y + r1Y;

      p2X = bB.m_sweep.c.x + r2X;
      p2Y = bB.m_sweep.c.y + r2Y;

      this.m_u1.Set(p1X - s1X, p1Y - s1Y);
      this.m_u2.Set(p2X - s2X, p2Y - s2Y);

      length1 = this.m_u1.Length();
      length2 = this.m_u2.Length();

      if (length1 > b2_linearSlop) {
        this.m_u1.Multiply(1.0 / length1);
      } else {
        this.m_u1.SetZero();
      }

      if (length2 > b2_linearSlop) {
        this.m_u2.Multiply(1.0 / length2);
      } else {
        this.m_u2.SetZero();
      }

      C = this.m_constant - length1 - this.m_ratio * length2;
      linearError = Max(linearError, -C);
      C = Clamp(C + b2_linearSlop, -b2_maxLinearCorrection, 0.0);
      impulse = -this.m_pulleyMass * C;

      p1X = -impulse * this.m_u1.x;
      p1Y = -impulse * this.m_u1.y;

      p2X = -this.m_ratio * impulse * this.m_u2.x;
      p2Y = -this.m_ratio * impulse * this.m_u2.y;

      bA.m_sweep.c.x += bA.m_invMass * p1X;
      bA.m_sweep.c.y += bA.m_invMass * p1Y;
      bA.m_sweep.a += bA.m_invI * (r1X * p1Y - r1Y * p1X);

      bB.m_sweep.c.x += bB.m_invMass * p2X;
      bB.m_sweep.c.y += bB.m_invMass * p2Y;
      bB.m_sweep.a += bB.m_invI * (r2X * p2Y - r2Y * p2X);

      bA.SynchronizeTransform();
      bB.SynchronizeTransform();
    }

    if (this.m_limitStateA === Joint.e_atUpperLimit) {
      tMat = bA.m_xf.R;
      r1X = this.m_localAnchorA.x - bA.m_sweep.localCenter.x;
      r1Y = this.m_localAnchorA.y - bA.m_sweep.localCenter.y;

      tX = tMat.col1.x * r1X + tMat.col2.x * r1Y;
      r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
      r1X = tX;

      p1X = bA.m_sweep.c.x + r1X;
      p1Y = bA.m_sweep.c.y + r1Y;

      this.m_u1.Set(p1X - s1X, p1Y - s1Y);
      length1 = this.m_u1.Length();

      if (length1 > b2_linearSlop) {
        this.m_u1.x *= 1.0 / length1;
        this.m_u1.y *= 1.0 / length1;
      } else {
        this.m_u1.SetZero();
      }

      C = this.m_maxLengthA - length1;
      linearError = Max(linearError, -C);
      C = Clamp(C + b2_linearSlop, -b2_maxLinearCorrection, 0.0);
      impulse = -this.m_limitMassA * C;

      p1X = -impulse * this.m_u1.x;
      p1Y = -impulse * this.m_u1.y;

      bA.m_sweep.c.x += bA.m_invMass * p1X;
      bA.m_sweep.c.y += bA.m_invMass * p1Y;
      bA.m_sweep.a += bA.m_invI * (r1X * p1Y - r1Y * p1X);

      bA.SynchronizeTransform();
    }

    if (this.m_limitStateB === Joint.e_atUpperLimit) {
      tMat = bB.m_xf.R;
      r2X = this.m_localAnchorB.x - bB.m_sweep.localCenter.x;
      r2Y = this.m_localAnchorB.y - bB.m_sweep.localCenter.y;

      tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
      r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
      r2X = tX;

      p2X = bB.m_sweep.c.x + r2X;
      p2Y = bB.m_sweep.c.y + r2Y;

      this.m_u2.Set(p2X - s2X, p2Y - s2Y);
      length2 = this.m_u2.Length();

      if (length2 > b2_linearSlop) {
        this.m_u2.x *= 1.0 / length2;
        this.m_u2.y *= 1.0 / length2;
      } else {
        this.m_u2.SetZero();
      }

      C = this.m_maxLengthB - length2;
      linearError = Max(linearError, -C);
      C = Clamp(C + b2_linearSlop, -b2_maxLinearCorrection, 0.0);
      impulse = -this.m_limitMassB * C;

      p2X = -impulse * this.m_u2.x;
      p2Y = -impulse * this.m_u2.y;

      bB.m_sweep.c.x += bB.m_invMass * p2X;
      bB.m_sweep.c.y += bB.m_invMass * p2Y;
      bB.m_sweep.a += bB.m_invI * (r2X * p2Y - r2Y * p2X);

      bB.SynchronizeTransform();
    }

    return linearError < b2_linearSlop;
  }
}

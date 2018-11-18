// tslint:disable variable-name

import Joint from './joint';
import RevoluteJointDef from './revolute-joint-def';

import Mat22 from '../../common/math/mat22';
import Mat33 from '../../common/math/mat33';
import Vec2 from '../../common/math/vec2';
import Vec3 from '../../common/math/vec3';
import TimeStep from '../time-step';
import Body from '../body';
import { Abs, Clamp } from '../../common/math';
import {
  b2_angularSlop,
  b2_maxAngularCorrection,
  b2_linearSlop,
} from '../../common/settings';

export default class RevoluteJoint extends Joint {
  public static tImpulse = new Vec2();

  public K = new Mat22();

  public K1 = new Mat22();
  public K2 = new Mat22();
  public K3 = new Mat22();

  public impulse3 = new Vec3();
  public impulse2 = new Vec2();
  public reduced = new Vec2();

  public m_localAnchorA = new Vec2();
  public m_localAnchorB = new Vec2();
  public m_referenceAngle = 0;

  public m_impulse = new Vec3();

  public m_motorImpulse = 0;
  public m_lowerAngle = 0;
  public m_upperAngle = 0;

  public m_maxMotorTorque = 0;
  public m_motorSpeed = 0;

  public m_enableLimit = false;
  public m_enableMotor = false;

  public m_limitState = 0;
  public m_mass = new Mat33();
  public m_motorMass = 0;

  constructor(def: RevoluteJointDef) {
    super(def);

    this.m_localAnchorA.SetV(def.localAnchorA);
    this.m_localAnchorB.SetV(def.localAnchorB);
    this.m_referenceAngle = def.referenceAngle;

    this.m_motorImpulse = 0.0;
    this.m_lowerAngle = def.lowerAngle;
    this.m_upperAngle = def.upperAngle;

    this.m_maxMotorTorque = def.maxMotorTorque;
    this.m_motorSpeed = def.motorSpeed;

    this.m_enableLimit = def.enableLimit;
    this.m_enableMotor = def.enableMotor;

    this.m_limitState = Joint.e_inactiveLimit;
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

  public GetJointAngle() {
    return this.m_bodyA && this.m_bodyB
      ? this.m_bodyB.m_sweep.a - this.m_bodyA.m_sweep.a - this.m_referenceAngle
      : 0;
  }

  public GetJointSpeed() {
    return this.m_bodyA && this.m_bodyB
      ? this.m_bodyB.m_angularVelocity - this.m_bodyA.m_angularVelocity
      : 0;
  }

  public IsLimitEnabled() {
    return this.m_enableLimit;
  }

  public EnableLimit(flag: boolean) {
    this.m_enableLimit = flag;
  }

  public GetLowerLimit() {
    return this.m_lowerAngle;
  }

  public GetUpperLimit() {
    return this.m_upperAngle;
  }

  public SetLimits(lower = 0, upper = 0) {
    this.m_lowerAngle = lower;
    this.m_upperAngle = upper;
  }

  public IsMotorEnabled() {
    if (!(this.m_bodyA && this.m_bodyB)) {
      return false;
    }

    this.m_bodyA.SetAwake(true);
    this.m_bodyB.SetAwake(true);
    return this.m_enableMotor;
  }

  public EnableMotor(flag: boolean) {
    this.m_enableMotor = flag;
  }

  public SetMotorSpeed(speed = 0) {
    if (!(this.m_bodyA && this.m_bodyB)) {
      return;
    }

    this.m_bodyA.SetAwake(true);
    this.m_bodyB.SetAwake(true);
    this.m_motorSpeed = speed;
  }

  public GetMotorSpeed() {
    return this.m_motorSpeed;
  }

  public SetMaxMotorTorque(torque = 0) {
    this.m_maxMotorTorque = torque;
  }

  public GetMotorTorque() {
    return this.m_maxMotorTorque;
  }

  public InitVelocityConstraints(step: TimeStep) {
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    // if (this.m_enableMotor || this.m_enableLimit) {}

    let tMat = bA.m_xf.R;
    let tX = 0;
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

    const m1 = bA.m_invMass;
    const m2 = bB.m_invMass;

    const i1 = bA.m_invI;
    const i2 = bB.m_invI;

    this.m_mass.col1.x = m1 + m2 + r1Y * r1Y * i1 + r2Y * r2Y * i2;
    this.m_mass.col2.x = -r1Y * r1X * i1 - r2Y * r2X * i2;
    this.m_mass.col3.x = -r1Y * i1 - r2Y * i2;

    this.m_mass.col1.y = this.m_mass.col2.x;
    this.m_mass.col2.y = m1 + m2 + r1X * r1X * i1 + r2X * r2X * i2;
    this.m_mass.col3.y = r1X * i1 + r2X * i2;

    this.m_mass.col1.z = this.m_mass.col3.x;
    this.m_mass.col2.z = this.m_mass.col3.y;
    this.m_mass.col3.z = i1 + i2;

    this.m_motorMass = 1 / (i1 + i2);

    if (this.m_enableMotor === false) {
      this.m_motorImpulse = 0.0;
    }

    if (this.m_enableLimit) {
      const jointAngle = bB.m_sweep.a - bA.m_sweep.a - this.m_referenceAngle;

      if (Abs(this.m_upperAngle - this.m_lowerAngle) < 2.0 * b2_angularSlop) {
        this.m_limitState = Joint.e_equalLimits;
      } else if (jointAngle <= this.m_lowerAngle) {
        if (this.m_limitState !== Joint.e_atLowerLimit) {
          this.m_impulse.z = 0.0;
        }

        this.m_limitState = Joint.e_atLowerLimit;
      } else if (jointAngle >= this.m_upperAngle) {
        if (this.m_limitState !== Joint.e_atUpperLimit) {
          this.m_impulse.z = 0.0;
        }

        this.m_limitState = Joint.e_atUpperLimit;
      } else {
        this.m_limitState = Joint.e_inactiveLimit;
        this.m_impulse.z = 0.0;
      }
    } else {
      this.m_limitState = Joint.e_inactiveLimit;
    }

    if (step.warmStarting) {
      this.m_impulse.x *= step.dtRatio;
      this.m_impulse.y *= step.dtRatio;
      this.m_motorImpulse *= step.dtRatio;

      const PX = this.m_impulse.x;
      const PY = this.m_impulse.y;

      bA.m_linearVelocity.x -= m1 * PX;
      bA.m_linearVelocity.y -= m1 * PY;
      bA.m_angularVelocity -=
        i1 * (r1X * PY - r1Y * PX + this.m_motorImpulse + this.m_impulse.z);

      bB.m_linearVelocity.x += m2 * PX;
      bB.m_linearVelocity.y += m2 * PY;
      bB.m_angularVelocity +=
        i2 * (r2X * PY - r2Y * PX + this.m_motorImpulse + this.m_impulse.z);
    } else {
      this.m_impulse.SetZero();
      this.m_motorImpulse = 0.0;
    }
  }

  public SolveVelocityConstraints(step: TimeStep) {
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    let tMat;
    let tX = 0;
    let newImpulse = 0;

    let r1X = 0;
    let r1Y = 0;

    let r2X = 0;
    let r2Y = 0;

    const v1 = bA.m_linearVelocity;
    let w1 = bA.m_angularVelocity;

    const v2 = bB.m_linearVelocity;
    let w2 = bB.m_angularVelocity;

    const m1 = bA.m_invMass;
    const m2 = bB.m_invMass;

    const i1 = bA.m_invI;
    const i2 = bB.m_invI;

    if (this.m_enableMotor && this.m_limitState !== Joint.e_equalLimits) {
      const Cdot = w2 - w1 - this.m_motorSpeed;
      let impulse = this.m_motorMass * -Cdot;

      const oldImpulse = this.m_motorImpulse;
      const maxImpulse = step.dt * this.m_maxMotorTorque;

      this.m_motorImpulse = Clamp(
        this.m_motorImpulse + impulse,
        -maxImpulse,
        maxImpulse,
      );

      impulse = this.m_motorImpulse - oldImpulse;
      w1 -= i1 * impulse;
      w2 += i2 * impulse;
    }

    if (this.m_enableLimit && this.m_limitState !== Joint.e_inactiveLimit) {
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

      const Cdot1X = v2.x + -w2 * r2Y - v1.x - -w1 * r1Y;
      const Cdot1Y = v2.y + w2 * r2X - v1.y - w1 * r1X;
      const Cdot2 = w2 - w1;

      this.m_mass.Solve33(this.impulse3, -Cdot1X, -Cdot1Y, -Cdot2);
      if (this.m_limitState === Joint.e_equalLimits) {
        this.m_impulse.Add(this.impulse3);
      } else if (this.m_limitState === Joint.e_atLowerLimit) {
        newImpulse = this.m_impulse.z + this.impulse3.z;

        if (newImpulse < 0.0) {
          this.m_mass.Solve22(this.reduced, -Cdot1X, -Cdot1Y);
          this.impulse3.x = this.reduced.x;
          this.impulse3.y = this.reduced.y;
          this.impulse3.z = -this.m_impulse.z;
          this.m_impulse.x += this.reduced.x;
          this.m_impulse.y += this.reduced.y;
          this.m_impulse.z = 0.0;
        }
      } else if (this.m_limitState === Joint.e_atUpperLimit) {
        newImpulse = this.m_impulse.z + this.impulse3.z;

        if (newImpulse > 0.0) {
          this.m_mass.Solve22(this.reduced, -Cdot1X, -Cdot1Y);
          this.impulse3.x = this.reduced.x;
          this.impulse3.y = this.reduced.y;
          this.impulse3.z = -this.m_impulse.z;
          this.m_impulse.x += this.reduced.x;
          this.m_impulse.y += this.reduced.y;
          this.m_impulse.z = 0.0;
        }
      }

      v1.x -= m1 * this.impulse3.x;
      v1.y -= m1 * this.impulse3.y;
      w1 -=
        i1 * (r1X * this.impulse3.y - r1Y * this.impulse3.x + this.impulse3.z);

      v2.x += m2 * this.impulse3.x;
      v2.y += m2 * this.impulse3.y;
      w2 +=
        i2 * (r2X * this.impulse3.y - r2Y * this.impulse3.x + this.impulse3.z);
    } else {
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

      const CdotX = v2.x + -w2 * r2Y - v1.x - -w1 * r1Y;
      const CdotY = v2.y + w2 * r2X - v1.y - w1 * r1X;

      this.m_mass.Solve22(this.impulse2, -CdotX, -CdotY);
      this.m_impulse.x += this.impulse2.x;
      this.m_impulse.y += this.impulse2.y;

      v1.x -= m1 * this.impulse2.x;
      v1.y -= m1 * this.impulse2.y;
      w1 -= i1 * (r1X * this.impulse2.y - r1Y * this.impulse2.x);

      v2.x += m2 * this.impulse2.x;
      v2.y += m2 * this.impulse2.y;
      w2 += i2 * (r2X * this.impulse2.y - r2Y * this.impulse2.x);
    }

    bA.m_linearVelocity.SetV(v1);
    bA.m_angularVelocity = w1;
    bB.m_linearVelocity.SetV(v2);
    bB.m_angularVelocity = w2;
  }

  public SolvePositionConstraints(baumgarte = 0) {
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    // const oldLimitImpulse = 0;
    let C = 0;

    let tMat;
    let angularError = 0.0;
    let positionError = 0.0;

    let tX = 0;
    let impulseX = 0;
    let impulseY = 0;

    if (this.m_enableLimit && this.m_limitState !== Joint.e_inactiveLimit) {
      const angle = bB.m_sweep.a - bA.m_sweep.a - this.m_referenceAngle;
      let limitImpulse = 0.0;

      if (this.m_limitState === Joint.e_equalLimits) {
        C = Clamp(
          angle - this.m_lowerAngle,
          -b2_maxAngularCorrection,
          b2_maxAngularCorrection,
        );

        limitImpulse = -this.m_motorMass * C;
        angularError = Abs(C);
      } else if (this.m_limitState === Joint.e_atLowerLimit) {
        C = angle - this.m_lowerAngle;
        angularError = -C;

        C = Clamp(C + b2_angularSlop, -b2_maxAngularCorrection, 0.0);
        limitImpulse = -this.m_motorMass * C;
      } else if (this.m_limitState === Joint.e_atUpperLimit) {
        C = angle - this.m_upperAngle;
        angularError = C;

        C = Clamp(C - b2_angularSlop, 0.0, b2_maxAngularCorrection);
        limitImpulse = -this.m_motorMass * C;
      }

      bA.m_sweep.a -= bA.m_invI * limitImpulse;
      bB.m_sweep.a += bB.m_invI * limitImpulse;

      bA.SynchronizeTransform();
      bB.SynchronizeTransform();
    }

    {
      tMat = bA.m_xf.R;
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

      let CX = bB.m_sweep.c.x + r2X - bA.m_sweep.c.x - r1X;
      let CY = bB.m_sweep.c.y + r2Y - bA.m_sweep.c.y - r1Y;

      const CLengthSquared = CX * CX + CY * CY;
      const CLength = Math.sqrt(CLengthSquared);

      positionError = CLength;

      const invMass1 = bA.m_invMass;
      const invMass2 = bB.m_invMass;

      const invI1 = bA.m_invI;
      const invI2 = bB.m_invI;

      const k_allowedStretch = 10.0 * b2_linearSlop;
      if (CLengthSquared > k_allowedStretch * k_allowedStretch) {
        // const uX = CX / CLength;
        // const uY = CY / CLength;

        const k = invMass1 + invMass2;
        const m = 1.0 / k;

        impulseX = m * -CX;
        impulseY = m * -CY;

        const k_beta = 0.5;
        bA.m_sweep.c.x -= k_beta * invMass1 * impulseX;
        bA.m_sweep.c.y -= k_beta * invMass1 * impulseY;

        bB.m_sweep.c.x += k_beta * invMass2 * impulseX;
        bB.m_sweep.c.y += k_beta * invMass2 * impulseY;

        CX = bB.m_sweep.c.x + r2X - bA.m_sweep.c.x - r1X;
        CY = bB.m_sweep.c.y + r2Y - bA.m_sweep.c.y - r1Y;
      }

      this.K1.col1.x = invMass1 + invMass2;
      this.K1.col2.x = 0.0;

      this.K1.col1.y = 0.0;
      this.K1.col2.y = invMass1 + invMass2;

      this.K2.col1.x = invI1 * r1Y * r1Y;
      this.K2.col2.x = -invI1 * r1X * r1Y;

      this.K2.col1.y = -invI1 * r1X * r1Y;
      this.K2.col2.y = invI1 * r1X * r1X;

      this.K3.col1.x = invI2 * r2Y * r2Y;
      this.K3.col2.x = -invI2 * r2X * r2Y;

      this.K3.col1.y = -invI2 * r2X * r2Y;
      this.K3.col2.y = invI2 * r2X * r2X;

      this.K.SetM(this.K1);
      this.K.AddM(this.K2);
      this.K.AddM(this.K3);
      this.K.Solve(RevoluteJoint.tImpulse, -CX, -CY);

      impulseX = RevoluteJoint.tImpulse.x;
      impulseY = RevoluteJoint.tImpulse.y;

      bA.m_sweep.c.x -= bA.m_invMass * impulseX;
      bA.m_sweep.c.y -= bA.m_invMass * impulseY;
      bA.m_sweep.a -= bA.m_invI * (r1X * impulseY - r1Y * impulseX);

      bB.m_sweep.c.x += bB.m_invMass * impulseX;
      bB.m_sweep.c.y += bB.m_invMass * impulseY;
      bB.m_sweep.a += bB.m_invI * (r2X * impulseY - r2Y * impulseX);

      bA.SynchronizeTransform();
      bB.SynchronizeTransform();
    }

    return positionError <= b2_linearSlop && angularError <= b2_angularSlop;
  }
}

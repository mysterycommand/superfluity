// tslint:disable variable-name

import Joint from './joint';
import Vec2 from '../../common/math/vec2';
import Mat33 from '../../common/math/mat33';
import Vec3 from '../../common/math/vec3';
import PrismaticJointDef from './prismatic-joint-def';
import Body from '../body';
import TimeStep from '../time-step';
import { MulMV, Abs, Clamp, Max, Min } from '../../common/math';
import {
  b2_linearSlop,
  b2_maxLinearCorrection,
  b2_angularSlop,
} from '../../common/settings';
import Mat22 from '../../common/math/mat22';

export default class PrismaticJoint extends Joint {
  public m_localAnchorA = new Vec2();
  public m_localAnchorB = new Vec2();

  public m_localXAxisA = new Vec2();
  public m_localYAxisA = new Vec2();

  public m_axis = new Vec2();
  public m_perp = new Vec2();
  public m_K = new Mat33();
  public m_impulse = new Vec3();

  public m_limitState = Joint.e_inactiveLimit;
  public m_refAngle = 0;

  public m_motorMass = 0;
  public m_motorImpulse = 0;

  public m_lowerTranslation = 0;
  public m_upperTranslation = 0;

  public m_maxMotorForce = 0;
  public m_motorSpeed = 0;

  public m_enableLimit = false;
  public m_enableMotor = false;

  public m_invMassA = 0;
  public m_invMassB = 0;

  public m_invIA = 0;
  public m_invIB = 0;

  public m_a1 = 0;
  public m_a2 = 0;

  public m_s1 = 0;
  public m_s2 = 0;

  constructor(def: PrismaticJointDef) {
    super(def);

    this.m_localAnchorA.SetV(def.localAnchorA);
    this.m_localAnchorB.SetV(def.localAnchorB);

    this.m_localXAxisA.SetV(def.localAxisA);
    this.m_localYAxisA.x = -this.m_localXAxisA.y;
    this.m_localYAxisA.y = this.m_localXAxisA.x;

    this.m_refAngle = def.referenceAngle;

    this.m_lowerTranslation = def.lowerTranslation;
    this.m_upperTranslation = def.upperTranslation;

    this.m_maxMotorForce = def.maxMotorForce;
    this.m_motorSpeed = def.motorSpeed;

    this.m_enableLimit = def.enableLimit;
    this.m_enableMotor = def.enableMotor;
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
      inv_dt *
        (this.m_impulse.x * this.m_perp.x +
          (this.m_motorImpulse + this.m_impulse.z) * this.m_axis.x),
      inv_dt *
        (this.m_impulse.x * this.m_perp.y +
          (this.m_motorImpulse + this.m_impulse.z) * this.m_axis.y),
    );
  }

  public GetReactionTorque(inv_dt = 0) {
    return inv_dt * this.m_impulse.y;
  }

  public GetJointTranslation() {
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    const p1 = bA.GetWorldPoint(this.m_localAnchorA);
    const p2 = bB.GetWorldPoint(this.m_localAnchorB);

    const dX = p2.x - p1.x;
    const dY = p2.y - p1.y;

    const axis = bA.GetWorldVector(this.m_localXAxisA);
    const translation = axis.x * dX + axis.y * dY;

    return translation;
  }

  public GetJointSpeed() {
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

    const dX = p2X - p1X;
    const dY = p2Y - p1Y;

    const axis = bA.GetWorldVector(this.m_localXAxisA);

    const v1 = bA.m_linearVelocity;
    const v2 = bB.m_linearVelocity;

    const w1 = bA.m_angularVelocity;
    const w2 = bB.m_angularVelocity;

    const speed =
      dX * (-w1 * axis.y) +
      dY * (w1 * axis.x) +
      (axis.x * (v2.x + -w2 * r2Y - v1.x - -w1 * r1Y) +
        axis.y * (v2.y + w2 * r2X - v1.y - w1 * r1X));

    return speed;
  }

  public IsLimitEnabled() {
    return this.m_enableLimit;
  }

  public EnableLimit(flag: boolean) {
    if (!(this.m_bodyA && this.m_bodyB)) {
      return;
    }

    this.m_bodyA.SetAwake(true);
    this.m_bodyB.SetAwake(true);
    this.m_enableLimit = flag;
  }

  public GetLowerLimit() {
    return this.m_lowerTranslation;
  }

  public GetUpperLimit() {
    return this.m_upperTranslation;
  }

  public SetLimits(lower = 0, upper = 0) {
    if (!(this.m_bodyA && this.m_bodyB)) {
      return;
    }

    this.m_bodyA.SetAwake(true);
    this.m_bodyB.SetAwake(true);

    this.m_lowerTranslation = lower;
    this.m_upperTranslation = upper;
  }

  public IsMotorEnabled() {
    return this.m_enableMotor;
  }

  public EnableMotor(flag: boolean) {
    if (!(this.m_bodyA && this.m_bodyB)) {
      return;
    }

    this.m_bodyA.SetAwake(true);
    this.m_bodyB.SetAwake(true);
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

  public SetMaxMotorForce(force = 0) {
    if (!(this.m_bodyA && this.m_bodyB)) {
      return;
    }

    this.m_bodyA.SetAwake(true);
    this.m_bodyB.SetAwake(true);

    this.m_maxMotorForce = force;
  }

  public GetMotorForce() {
    return this.m_motorImpulse;
  }

  public InitVelocityConstraints(step: TimeStep) {
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    let tX = 0;
    let tMat = bA.m_xf.R;

    this.m_localCenterA.SetV(bA.GetLocalCenter());
    this.m_localCenterB.SetV(bB.GetLocalCenter());

    const xf1 = bA.GetTransform();
    let r1X = this.m_localAnchorA.x - this.m_localCenterA.x;
    let r1Y = this.m_localAnchorA.y - this.m_localCenterA.y;

    tX = tMat.col1.x * r1X + tMat.col2.x * r1Y;
    r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
    r1X = tX;
    tMat = bB.m_xf.R;

    let r2X = this.m_localAnchorB.x - this.m_localCenterB.x;
    let r2Y = this.m_localAnchorB.y - this.m_localCenterB.y;

    tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
    r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
    r2X = tX;

    const dX = bB.m_sweep.c.x + r2X - bA.m_sweep.c.x - r1X;
    const dY = bB.m_sweep.c.y + r2Y - bA.m_sweep.c.y - r1Y;

    this.m_invMassA = bA.m_invMass;
    this.m_invMassB = bB.m_invMass;
    this.m_invIA = bA.m_invI;
    this.m_invIB = bB.m_invI;

    {
      this.m_axis.SetV(MulMV(xf1.R, this.m_localXAxisA));

      this.m_a1 = (dX + r1X) * this.m_axis.y - (dY + r1Y) * this.m_axis.x;
      this.m_a2 = r2X * this.m_axis.y - r2Y * this.m_axis.x;

      this.m_motorMass =
        this.m_invMassA +
        this.m_invMassB +
        this.m_invIA * this.m_a1 * this.m_a1 +
        this.m_invIB * this.m_a2 * this.m_a2;

      if (this.m_motorMass > Number.MIN_VALUE) {
        this.m_motorMass = 1.0 / this.m_motorMass;
      }
    }

    {
      this.m_perp.SetV(MulMV(xf1.R, this.m_localYAxisA));

      this.m_s1 = (dX + r1X) * this.m_perp.y - (dY + r1Y) * this.m_perp.x;
      this.m_s2 = r2X * this.m_perp.y - r2Y * this.m_perp.x;

      const m1 = this.m_invMassA;
      const m2 = this.m_invMassB;

      const i1 = this.m_invIA;
      const i2 = this.m_invIB;

      this.m_K.col1.x =
        m1 + m2 + i1 * this.m_s1 * this.m_s1 + i2 * this.m_s2 * this.m_s2;

      this.m_K.col1.y = i1 * this.m_s1 + i2 * this.m_s2;
      this.m_K.col1.z = i1 * this.m_s1 * this.m_a1 + i2 * this.m_s2 * this.m_a2;
      this.m_K.col2.x = this.m_K.col1.y;

      this.m_K.col2.y = i1 + i2;
      this.m_K.col2.z = i1 * this.m_a1 + i2 * this.m_a2;
      this.m_K.col3.x = this.m_K.col1.z;

      this.m_K.col3.y = this.m_K.col2.z;
      this.m_K.col3.z =
        m1 + m2 + i1 * this.m_a1 * this.m_a1 + i2 * this.m_a2 * this.m_a2;
    }

    if (this.m_enableLimit) {
      const jointTransition = this.m_axis.x * dX + this.m_axis.y * dY;

      if (
        Abs(this.m_upperTranslation - this.m_lowerTranslation) <
        2.0 * b2_linearSlop
      ) {
        this.m_limitState = Joint.e_equalLimits;
      } else if (jointTransition <= this.m_lowerTranslation) {
        if (this.m_limitState !== Joint.e_atLowerLimit) {
          this.m_limitState = Joint.e_atLowerLimit;
          this.m_impulse.z = 0.0;
        }
      } else if (jointTransition >= this.m_upperTranslation) {
        if (this.m_limitState !== Joint.e_atUpperLimit) {
          this.m_limitState = Joint.e_atUpperLimit;
          this.m_impulse.z = 0.0;
        }
      } else {
        this.m_limitState = Joint.e_inactiveLimit;
        this.m_impulse.z = 0.0;
      }
    } else {
      this.m_limitState = Joint.e_inactiveLimit;
    }

    if (this.m_enableMotor === false) {
      this.m_motorImpulse = 0.0;
    }

    if (step.warmStarting) {
      this.m_impulse.x *= step.dtRatio;
      this.m_impulse.y *= step.dtRatio;
      this.m_motorImpulse *= step.dtRatio;

      const PX =
        this.m_impulse.x * this.m_perp.x +
        (this.m_motorImpulse + this.m_impulse.z) * this.m_axis.x;
      const PY =
        this.m_impulse.x * this.m_perp.y +
        (this.m_motorImpulse + this.m_impulse.z) * this.m_axis.y;

      const L1 =
        this.m_impulse.x * this.m_s1 +
        this.m_impulse.y +
        (this.m_motorImpulse + this.m_impulse.z) * this.m_a1;
      const L2 =
        this.m_impulse.x * this.m_s2 +
        this.m_impulse.y +
        (this.m_motorImpulse + this.m_impulse.z) * this.m_a2;

      bA.m_linearVelocity.x -= this.m_invMassA * PX;
      bA.m_linearVelocity.y -= this.m_invMassA * PY;
      bA.m_angularVelocity -= this.m_invIA * L1;

      bB.m_linearVelocity.x += this.m_invMassB * PX;
      bB.m_linearVelocity.y += this.m_invMassB * PY;
      bB.m_angularVelocity += this.m_invIB * L2;
    } else {
      this.m_impulse.SetZero();
      this.m_motorImpulse = 0.0;
    }
  }

  public SolveVelocityConstraints(step: TimeStep) {
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    const v1 = bA.m_linearVelocity;
    let w1 = bA.m_angularVelocity;

    const v2 = bB.m_linearVelocity;
    let w2 = bB.m_angularVelocity;

    let PX = 0;
    let PY = 0;

    let L1 = 0;
    let L2 = 0;

    if (this.m_enableMotor && this.m_limitState !== Joint.e_equalLimits) {
      const Cdot =
        this.m_axis.x * (v2.x - v1.x) +
        this.m_axis.y * (v2.y - v1.y) +
        this.m_a2 * w2 -
        this.m_a1 * w1;

      let impulse = this.m_motorMass * (this.m_motorSpeed - Cdot);
      const oldImpulse = this.m_motorImpulse;
      const maxImpulse = step.dt * this.m_maxMotorForce;

      this.m_motorImpulse = Clamp(
        this.m_motorImpulse + impulse,
        -maxImpulse,
        maxImpulse,
      );

      impulse = this.m_motorImpulse - oldImpulse;

      PX = impulse * this.m_axis.x;
      PY = impulse * this.m_axis.y;

      L1 = impulse * this.m_a1;
      L2 = impulse * this.m_a2;

      v1.x -= this.m_invMassA * PX;
      v1.y -= this.m_invMassA * PY;
      w1 -= this.m_invIA * L1;

      v2.x += this.m_invMassB * PX;
      v2.y += this.m_invMassB * PY;
      w2 += this.m_invIB * L2;
    }

    const Cdot1X =
      this.m_perp.x * (v2.x - v1.x) +
      this.m_perp.y * (v2.y - v1.y) +
      this.m_s2 * w2 -
      this.m_s1 * w1;

    const Cdot1Y = w2 - w1;

    if (this.m_enableLimit && this.m_limitState !== Joint.e_inactiveLimit) {
      const Cdot2 =
        this.m_axis.x * (v2.x - v1.x) +
        this.m_axis.y * (v2.y - v1.y) +
        this.m_a2 * w2 -
        this.m_a1 * w1;

      const f1 = this.m_impulse.Copy();
      const df = this.m_K.Solve33(new Vec3(), -Cdot1X, -Cdot1Y, -Cdot2);

      this.m_impulse.Add(df);

      if (this.m_limitState === Joint.e_atLowerLimit) {
        this.m_impulse.z = Max(this.m_impulse.z, 0.0);
      } else if (this.m_limitState === Joint.e_atUpperLimit) {
        this.m_impulse.z = Min(this.m_impulse.z, 0.0);
      }

      const bX = -Cdot1X - (this.m_impulse.z - f1.z) * this.m_K.col3.x;
      const bY = -Cdot1Y - (this.m_impulse.z - f1.z) * this.m_K.col3.y;
      const f2r = this.m_K.Solve22(new Vec2(), bX, bY);

      f2r.x += f1.x;
      f2r.y += f1.y;

      this.m_impulse.x = f2r.x;
      this.m_impulse.y = f2r.y;

      df.x = this.m_impulse.x - f1.x;
      df.y = this.m_impulse.y - f1.y;
      df.z = this.m_impulse.z - f1.z;

      PX = df.x * this.m_perp.x + df.z * this.m_axis.x;
      PY = df.x * this.m_perp.y + df.z * this.m_axis.y;

      L1 = df.x * this.m_s1 + df.y + df.z * this.m_a1;
      L2 = df.x * this.m_s2 + df.y + df.z * this.m_a2;

      v1.x -= this.m_invMassA * PX;
      v1.y -= this.m_invMassA * PY;
      w1 -= this.m_invIA * L1;

      v2.x += this.m_invMassB * PX;
      v2.y += this.m_invMassB * PY;
      w2 += this.m_invIB * L2;
    } else {
      const df2 = this.m_K.Solve22(new Vec2(), -Cdot1X, -Cdot1Y);

      this.m_impulse.x += df2.x;
      this.m_impulse.y += df2.y;

      PX = df2.x * this.m_perp.x;
      PY = df2.x * this.m_perp.y;

      L1 = df2.x * this.m_s1 + df2.y;
      L2 = df2.x * this.m_s2 + df2.y;

      v1.x -= this.m_invMassA * PX;
      v1.y -= this.m_invMassA * PY;
      w1 -= this.m_invIA * L1;

      v2.x += this.m_invMassB * PX;
      v2.y += this.m_invMassB * PY;
      w2 += this.m_invIB * L2;
    }

    bA.m_linearVelocity.SetV(v1);
    bA.m_angularVelocity = w1;

    bB.m_linearVelocity.SetV(v2);
    bB.m_angularVelocity = w2;
  }

  public SolvePositionConstraints(baumgarte = 0) {
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    const c1 = bA.m_sweep.c;
    let a1 = bA.m_sweep.a;

    const c2 = bB.m_sweep.c;
    let a2 = bB.m_sweep.a;

    let tX = 0;

    let m1 = 0;
    let m2 = 0;

    let i1 = 0;
    let i2 = 0;

    let linearError = 0.0;
    let angularError = 0.0;

    let active = false;

    let C2 = 0.0;

    const R1 = Mat22.FromAngle(a1);
    const R2 = Mat22.FromAngle(a2);

    let tMat = R1;

    let r1X = this.m_localAnchorA.x - this.m_localCenterA.x;
    let r1Y = this.m_localAnchorA.y - this.m_localCenterA.y;

    tX = tMat.col1.x * r1X + tMat.col2.x * r1Y;
    r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
    r1X = tX;
    tMat = R2;

    let r2X = this.m_localAnchorB.x - this.m_localCenterB.x;
    let r2Y = this.m_localAnchorB.y - this.m_localCenterB.y;

    tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
    r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
    r2X = tX;

    const dX = c2.x + r2X - c1.x - r1X;
    const dY = c2.y + r2Y - c1.y - r1Y;

    if (this.m_enableLimit) {
      this.m_axis = MulMV(R1, this.m_localXAxisA);
      this.m_a1 = (dX + r1X) * this.m_axis.y - (dY + r1Y) * this.m_axis.x;
      this.m_a2 = r2X * this.m_axis.y - r2Y * this.m_axis.x;

      const translation = this.m_axis.x * dX + this.m_axis.y * dY;
      if (
        Abs(this.m_upperTranslation - this.m_lowerTranslation) <
        2.0 * b2_linearSlop
      ) {
        C2 = Clamp(
          translation,
          -b2_maxLinearCorrection,
          b2_maxLinearCorrection,
        );

        linearError = Abs(translation);
        active = true;
      } else if (translation <= this.m_lowerTranslation) {
        C2 = Clamp(
          translation - this.m_lowerTranslation + b2_linearSlop,
          -b2_maxLinearCorrection,
          0.0,
        );

        linearError = this.m_lowerTranslation - translation;
        active = true;
      } else if (translation >= this.m_upperTranslation) {
        C2 = Clamp(
          translation - this.m_upperTranslation + b2_linearSlop,
          0.0,
          b2_maxLinearCorrection,
        );

        linearError = translation - this.m_upperTranslation;
        active = true;
      }
    }

    this.m_perp = MulMV(R1, this.m_localYAxisA);
    this.m_s1 = (dX + r1X) * this.m_perp.y - (dY + r1Y) * this.m_perp.x;
    this.m_s2 = r2X * this.m_perp.y - r2Y * this.m_perp.x;

    const impulse = new Vec3();
    const C1X = this.m_perp.x * dX + this.m_perp.y * dY;
    const C1Y = a2 - a1 - this.m_refAngle;

    linearError = Max(linearError, Abs(C1X));
    angularError = Abs(C1Y);

    if (active) {
      m1 = this.m_invMassA;
      m2 = this.m_invMassB;

      i1 = this.m_invIA;
      i2 = this.m_invIB;

      this.m_K.col1.x =
        m1 + m2 + i1 * this.m_s1 * this.m_s1 + i2 * this.m_s2 * this.m_s2;
      this.m_K.col1.y = i1 * this.m_s1 + i2 * this.m_s2;
      this.m_K.col1.z = i1 * this.m_s1 * this.m_a1 + i2 * this.m_s2 * this.m_a2;

      this.m_K.col2.x = this.m_K.col1.y;
      this.m_K.col2.y = i1 + i2;
      this.m_K.col2.z = i1 * this.m_a1 + i2 * this.m_a2;

      this.m_K.col3.x = this.m_K.col1.z;
      this.m_K.col3.y = this.m_K.col2.z;
      this.m_K.col3.z =
        m1 + m2 + i1 * this.m_a1 * this.m_a1 + i2 * this.m_a2 * this.m_a2;

      this.m_K.Solve33(impulse, -C1X, -C1Y, -C2);
    } else {
      m1 = this.m_invMassA;
      m2 = this.m_invMassB;

      i1 = this.m_invIA;
      i2 = this.m_invIB;

      const k11 =
        m1 + m2 + i1 * this.m_s1 * this.m_s1 + i2 * this.m_s2 * this.m_s2;
      const k12 = i1 * this.m_s1 + i2 * this.m_s2;
      const k22 = i1 + i2;

      this.m_K.col1.Set(k11, k12, 0.0);
      this.m_K.col2.Set(k12, k22, 0.0);

      const impulse1 = this.m_K.Solve22(new Vec2(), -C1X, -C1Y);
      impulse.x = impulse1.x;
      impulse.y = impulse1.y;
      impulse.z = 0.0;
    }

    const PX = impulse.x * this.m_perp.x + impulse.z * this.m_axis.x;
    const PY = impulse.x * this.m_perp.y + impulse.z * this.m_axis.y;

    const L1 = impulse.x * this.m_s1 + impulse.y + impulse.z * this.m_a1;
    const L2 = impulse.x * this.m_s2 + impulse.y + impulse.z * this.m_a2;

    c1.x -= this.m_invMassA * PX;
    c1.y -= this.m_invMassA * PY;
    a1 -= this.m_invIA * L1;

    c2.x += this.m_invMassB * PX;
    c2.y += this.m_invMassB * PY;
    a2 += this.m_invIB * L2;

    bA.m_sweep.a = a1;
    bB.m_sweep.a = a2;

    bA.SynchronizeTransform();
    bB.SynchronizeTransform();

    return linearError <= b2_linearSlop && angularError <= b2_angularSlop;
  }
}

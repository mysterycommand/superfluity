// tslint:disable variable-name

import Joint from './joint';
import GearJointDef from './gear-joint-def';
import Vec2 from '../../common/math/vec2';
import Jacobian from './jacobian';
import Body from '../body';
import RevoluteJoint from './revolute-joint';
import PrismaticJoint from './prismatic-joint';
import TimeStep from '../time-step';
import { b2_linearSlop } from '../../common/settings';

export default class GearJoint extends Joint {
  public m_groundAnchorA = new Vec2();
  public m_groundAnchorB = new Vec2();

  public m_localAnchorA = new Vec2();
  public m_localAnchorB = new Vec2();
  public m_J = new Jacobian();

  public m_revolute1?: RevoluteJoint;
  public m_revolute2?: RevoluteJoint;

  public m_prismatic1?: PrismaticJoint;
  public m_prismatic2?: PrismaticJoint;

  public m_groundA?: Body;
  public m_groundB?: Body;

  public m_bodyA?: Body;
  public m_bodyB?: Body;

  public m_ratio = 0;
  public m_constant = 0;
  public m_impulse = 0;

  public m_mass = 0;

  constructor(def: GearJointDef) {
    super(def);

    if (!(def.jointA && def.jointB)) {
      return;
    }

    const type1 = parseInt(`${def.jointA.m_type}`, 10);
    const type2 = parseInt(`${def.jointB.m_type}`, 10);

    this.m_revolute1 = undefined;
    this.m_prismatic1 = undefined;

    this.m_revolute2 = undefined;
    this.m_prismatic2 = undefined;

    let coordinate1 = 0;
    let coordinate2 = 0;

    this.m_groundA = def.jointA.GetBodyA();
    this.m_bodyA = def.jointA.GetBodyB();

    if (type1 === Joint.e_revoluteJoint) {
      this.m_revolute1 =
        def.jointA instanceof RevoluteJoint ? def.jointA : undefined;

      if (!this.m_revolute1) {
        return;
      }

      this.m_groundAnchorA.SetV(this.m_revolute1.m_localAnchorA);
      this.m_localAnchorA.SetV(this.m_revolute1.m_localAnchorB);

      coordinate1 = this.m_revolute1.GetJointAngle();
    } else {
      this.m_prismatic1 =
        def.jointA instanceof PrismaticJoint ? def.jointA : undefined;

      if (!this.m_prismatic1) {
        return;
      }

      this.m_groundAnchorA.SetV(this.m_prismatic1.m_localAnchorA);
      this.m_localAnchorA.SetV(this.m_prismatic1.m_localAnchorB);

      coordinate1 = this.m_prismatic1.GetJointTranslation();
    }

    this.m_groundB = def.jointB.GetBodyA();
    this.m_bodyB = def.jointB.GetBodyB();

    if (type2 === Joint.e_revoluteJoint) {
      this.m_revolute2 =
        def.jointB instanceof RevoluteJoint ? def.jointB : undefined;

      if (!this.m_revolute2) {
        return;
      }

      this.m_groundAnchorB.SetV(this.m_revolute2.m_localAnchorA);
      this.m_localAnchorB.SetV(this.m_revolute2.m_localAnchorB);

      coordinate2 = this.m_revolute2.GetJointAngle();
    } else {
      this.m_prismatic2 =
        def.jointB instanceof PrismaticJoint ? def.jointB : undefined;

      if (!this.m_prismatic2) {
        return;
      }

      this.m_groundAnchorB.SetV(this.m_prismatic2.m_localAnchorA);
      this.m_localAnchorB.SetV(this.m_prismatic2.m_localAnchorB);

      coordinate2 = this.m_prismatic2.GetJointTranslation();
    }

    this.m_ratio = def.ratio;
    this.m_constant = coordinate1 + this.m_ratio * coordinate2;
    this.m_impulse = 0.0;
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
      inv_dt * this.m_impulse * this.m_J.linearB.x,
      inv_dt * this.m_impulse * this.m_J.linearB.y,
    );
  }

  public GetReactionTorque(inv_dt = 0) {
    const bB = this.m_bodyB as Body;

    const tMat = bB.m_xf.R;
    let rX = this.m_localAnchorA.x - bB.m_sweep.localCenter.x;
    let rY = this.m_localAnchorA.y - bB.m_sweep.localCenter.y;
    const tX = tMat.col1.x * rX + tMat.col2.x * rY;

    rY = tMat.col1.y * rX + tMat.col2.y * rY;
    rX = tX;

    const PX = this.m_impulse * this.m_J.linearB.x;
    const PY = this.m_impulse * this.m_J.linearB.y;

    return inv_dt * (this.m_impulse * this.m_J.angularB - rX * PY + rY * PX);
  }

  public GetRatio() {
    return this.m_ratio;
  }

  public SetRatio(ratio = 0) {
    this.m_ratio = ratio;
  }

  public InitVelocityConstraints(step: TimeStep) {
    if (!(this.m_prismatic1 && this.m_prismatic2)) {
      return;
    }

    const g1 = this.m_groundA as Body;
    const g2 = this.m_groundB as Body;

    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    let ugX = 0;
    let ugY = 0;

    let rX = 0;
    let rY = 0;

    let tMat;
    let tVec;

    let crug = 0;
    let tX = 0;
    let K = 0.0;

    this.m_J.SetZero();

    if (this.m_revolute1) {
      this.m_J.angularA = -1.0;
      K += bA.m_invI;
    } else {
      tMat = g1.m_xf.R;
      tVec = this.m_prismatic1.m_localXAxisA;

      ugX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
      ugY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

      tMat = bA.m_xf.R;
      rX = this.m_localAnchorA.x - bA.m_sweep.localCenter.x;
      rY = this.m_localAnchorA.y - bA.m_sweep.localCenter.y;

      tX = tMat.col1.x * rX + tMat.col2.x * rY;
      rY = tMat.col1.y * rX + tMat.col2.y * rY;
      rX = tX;

      crug = rX * ugY - rY * ugX;

      this.m_J.linearA.Set(-ugX, -ugY);
      this.m_J.angularA = -crug;

      K += bA.m_invMass + bA.m_invI * crug * crug;
    }

    if (this.m_revolute2) {
      this.m_J.angularB = -this.m_ratio;
      K += this.m_ratio * this.m_ratio * bB.m_invI;
    } else {
      tMat = g2.m_xf.R;
      tVec = this.m_prismatic2.m_localXAxisA;

      ugX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
      ugY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

      tMat = bB.m_xf.R;
      rX = this.m_localAnchorB.x - bB.m_sweep.localCenter.x;
      rY = this.m_localAnchorB.y - bB.m_sweep.localCenter.y;

      tX = tMat.col1.x * rX + tMat.col2.x * rY;
      rY = tMat.col1.y * rX + tMat.col2.y * rY;
      rX = tX;

      crug = rX * ugY - rY * ugX;
      this.m_J.linearB.Set(-this.m_ratio * ugX, -this.m_ratio * ugY);
      this.m_J.angularB = -this.m_ratio * crug;

      K +=
        this.m_ratio * this.m_ratio * (bB.m_invMass + bB.m_invI * crug * crug);
    }

    this.m_mass = K > 0.0 ? 1.0 / K : 0.0;
    if (step.warmStarting) {
      bA.m_linearVelocity.x +=
        bA.m_invMass * this.m_impulse * this.m_J.linearA.x;
      bA.m_linearVelocity.y +=
        bA.m_invMass * this.m_impulse * this.m_J.linearA.y;
      bA.m_angularVelocity += bA.m_invI * this.m_impulse * this.m_J.angularA;

      bB.m_linearVelocity.x +=
        bB.m_invMass * this.m_impulse * this.m_J.linearB.x;
      bB.m_linearVelocity.y +=
        bB.m_invMass * this.m_impulse * this.m_J.linearB.y;
      bB.m_angularVelocity += bB.m_invI * this.m_impulse * this.m_J.angularB;
    } else {
      this.m_impulse = 0.0;
    }
  }

  public SolveVelocityConstraints(step: TimeStep) {
    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    const Cdot = this.m_J.Compute(
      bA.m_linearVelocity,
      bA.m_angularVelocity,
      bB.m_linearVelocity,
      bB.m_angularVelocity,
    );

    const impulse = -this.m_mass * Cdot;
    this.m_impulse += impulse;

    bA.m_linearVelocity.x += bA.m_invMass * impulse * this.m_J.linearA.x;
    bA.m_linearVelocity.y += bA.m_invMass * impulse * this.m_J.linearA.y;
    bA.m_angularVelocity += bA.m_invI * impulse * this.m_J.angularA;

    bB.m_linearVelocity.x += bB.m_invMass * impulse * this.m_J.linearB.x;
    bB.m_linearVelocity.y += bB.m_invMass * impulse * this.m_J.linearB.y;
    bB.m_angularVelocity += bB.m_invI * impulse * this.m_J.angularB;
  }

  public SolvePositionConstraints(baumgarte = 0) {
    if (!(this.m_prismatic1 && this.m_prismatic2)) {
      return false;
    }

    const bA = this.m_bodyA as Body;
    const bB = this.m_bodyB as Body;

    const linearError = 0.0;
    let coordinate1 = 0;
    let coordinate2 = 0;

    if (this.m_revolute1) {
      coordinate1 = this.m_revolute1.GetJointAngle();
    } else {
      coordinate1 = this.m_prismatic1.GetJointTranslation();
    }

    if (this.m_revolute2) {
      coordinate2 = this.m_revolute2.GetJointAngle();
    } else {
      coordinate2 = this.m_prismatic2.GetJointTranslation();
    }

    const C = this.m_constant - (coordinate1 + this.m_ratio * coordinate2);
    const impulse = -this.m_mass * C;

    bA.m_sweep.c.x += bA.m_invMass * impulse * this.m_J.linearA.x;
    bA.m_sweep.c.y += bA.m_invMass * impulse * this.m_J.linearA.y;
    bA.m_sweep.a += bA.m_invI * impulse * this.m_J.angularA;

    bB.m_sweep.c.x += bB.m_invMass * impulse * this.m_J.linearB.x;
    bB.m_sweep.c.y += bB.m_invMass * impulse * this.m_J.linearB.y;
    bB.m_sweep.a += bB.m_invI * impulse * this.m_J.angularB;

    bA.SynchronizeTransform();
    bB.SynchronizeTransform();

    return linearError < b2_linearSlop;
  }
}

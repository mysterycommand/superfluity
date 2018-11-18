// tslint:disable variable-name

import Joint from './joint';
import Mat22 from '../../common/math/mat22';
import Vec2 from '../../common/math/vec2';
import TimeStep from '../time-step';
import Body from '../body';
import MouseJointDef from './mouse-joint-def';

export default class MouseJoint extends Joint {
  public K = new Mat22();
  public K1 = new Mat22();
  public K2 = new Mat22();

  public m_localAnchor = new Vec2();
  public m_target = new Vec2();
  public m_impulse = new Vec2();
  public m_mass = new Mat22();
  public m_C = new Vec2();

  public m_maxForce = Infinity;
  public m_frequencyHz = 0;
  public m_dampingRatio = 0;

  public m_beta = 0;
  public m_gamma = 0;

  constructor(def: MouseJointDef) {
    super(def);

    this.m_target.SetV(def.target);

    if (!this.m_bodyB) {
      return;
    }

    const tX = this.m_target.x - this.m_bodyB.m_xf.position.x;
    const tY = this.m_target.y - this.m_bodyB.m_xf.position.y;
    const tMat = this.m_bodyB.m_xf.R;

    this.m_localAnchor.x = tX * tMat.col1.x + tY * tMat.col1.y;
    this.m_localAnchor.y = tX * tMat.col2.x + tY * tMat.col2.y;

    this.m_maxForce = def.maxForce;
    this.m_frequencyHz = def.frequencyHz;
    this.m_dampingRatio = def.dampingRatio;
  }

  public GetAnchorA() {
    return this.m_target;
  }

  public GetAnchorB() {
    if (!this.m_bodyB) {
      return new Vec2();
    }

    return this.m_bodyB.GetWorldPoint(this.m_localAnchor);
  }

  public GetReactionForce(inv_dt = 0) {
    return new Vec2(inv_dt * this.m_impulse.x, inv_dt * this.m_impulse.y);
  }

  public GetReactionTorque(inv_dt = 0) {
    return 0.0;
  }

  public GetTarget() {
    return this.m_target;
  }

  public SetTarget(target: Vec2) {
    if (!this.m_bodyB) {
      return;
    }

    if (this.m_bodyB.IsAwake() === false) {
      this.m_bodyB.SetAwake(true);
    }

    this.m_target = target;
  }

  public GetMaxForce() {
    return this.m_maxForce;
  }

  public SetMaxForce(maxForce = 0) {
    this.m_maxForce = maxForce;
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
    const b = this.m_bodyB as Body;

    const mass = b.GetMass();
    const omega = 2.0 * Math.PI * this.m_frequencyHz;

    const d = 2.0 * mass * this.m_dampingRatio * omega;
    const k = mass * omega * omega;

    this.m_gamma = step.dt * (d + step.dt * k);
    this.m_gamma = this.m_gamma !== 0 ? 1 / this.m_gamma : 0.0;
    this.m_beta = step.dt * k * this.m_gamma;

    const tMat = b.m_xf.R;
    let rX = this.m_localAnchor.x - b.m_sweep.localCenter.x;
    let rY = this.m_localAnchor.y - b.m_sweep.localCenter.y;
    const tX = tMat.col1.x * rX + tMat.col2.x * rY;
    rY = tMat.col1.y * rX + tMat.col2.y * rY;
    rX = tX;

    const invMass = b.m_invMass;
    const invI = b.m_invI;

    this.K1.col1.x = invMass;
    this.K1.col2.x = 0.0;

    this.K1.col1.y = 0.0;
    this.K1.col2.y = invMass;

    this.K2.col1.x = invI * rY * rY;
    this.K2.col2.x = -invI * rX * rY;

    this.K2.col1.y = -invI * rX * rY;
    this.K2.col2.y = invI * rX * rX;

    this.K.SetM(this.K1);
    this.K.AddM(this.K2);

    this.K.col1.x += this.m_gamma;
    this.K.col2.y += this.m_gamma;

    this.K.GetInverse(this.m_mass);

    this.m_C.x = b.m_sweep.c.x + rX - this.m_target.x;
    this.m_C.y = b.m_sweep.c.y + rY - this.m_target.y;

    b.m_angularVelocity *= 0.98;

    this.m_impulse.x *= step.dtRatio;
    this.m_impulse.y *= step.dtRatio;

    b.m_linearVelocity.x += invMass * this.m_impulse.x;
    b.m_linearVelocity.y += invMass * this.m_impulse.y;

    b.m_angularVelocity +=
      invI * (rX * this.m_impulse.y - rY * this.m_impulse.x);
  }

  public SolveVelocityConstraints(step: TimeStep) {
    const b = this.m_bodyB as Body;

    let tX = 0;
    let tY = 0;

    let tMat = b.m_xf.R;
    let rX = this.m_localAnchor.x - b.m_sweep.localCenter.x;
    let rY = this.m_localAnchor.y - b.m_sweep.localCenter.y;
    tX = tMat.col1.x * rX + tMat.col2.x * rY;
    rY = tMat.col1.y * rX + tMat.col2.y * rY;
    rX = tX;

    const CdotX = b.m_linearVelocity.x + -b.m_angularVelocity * rY;
    const CdotY = b.m_linearVelocity.y + b.m_angularVelocity * rX;

    tMat = this.m_mass;
    tX = CdotX + this.m_beta * this.m_C.x + this.m_gamma * this.m_impulse.x;
    tY = CdotY + this.m_beta * this.m_C.y + this.m_gamma * this.m_impulse.y;

    let impulseX = -(tMat.col1.x * tX + tMat.col2.x * tY);
    let impulseY = -(tMat.col1.y * tX + tMat.col2.y * tY);

    const oldImpulseX = this.m_impulse.x;
    const oldImpulseY = this.m_impulse.y;

    this.m_impulse.x += impulseX;
    this.m_impulse.y += impulseY;

    const maxImpulse = step.dt * this.m_maxForce;
    if (this.m_impulse.LengthSquared() > maxImpulse * maxImpulse) {
      this.m_impulse.Multiply(maxImpulse / this.m_impulse.Length());
    }

    impulseX = this.m_impulse.x - oldImpulseX;
    impulseY = this.m_impulse.y - oldImpulseY;

    b.m_linearVelocity.x += b.m_invMass * impulseX;
    b.m_linearVelocity.y += b.m_invMass * impulseY;

    b.m_angularVelocity += b.m_invI * (rX * impulseY - rY * impulseX);
  }

  public SolvePositionConstraints(baumgarte = 0) {
    return true;
  }
}

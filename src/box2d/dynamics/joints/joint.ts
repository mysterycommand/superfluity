// tslint:disable variable-name

import JointEdge from './joint-edge';
import Vec2 from '../../common/math/vec2';
import JointDef from './joint-def';
import { b2Assert } from '../../common/settings';
import Body from '../body';
import TimeStep from '../time-step';

export default class Joint {
  public static e_unknownJoint = 0;
  public static e_revoluteJoint = 1;
  public static e_prismaticJoint = 2;
  public static e_distanceJoint = 3;
  public static e_pulleyJoint = 4;
  public static e_mouseJoint = 5;
  public static e_gearJoint = 6;
  public static e_lineJoint = 7;
  public static e_weldJoint = 8;
  public static e_frictionJoint = 9;
  public static e_inactiveLimit = 0;
  public static e_atLowerLimit = 1;
  public static e_atUpperLimit = 2;
  public static e_equalLimits = 3;

  public static Destroy(joint: Joint, allocator: any) {} // tslint:disable-line no-empty

  public m_edgeA = new JointEdge();
  public m_edgeB = new JointEdge();

  public m_localCenterA = new Vec2();
  public m_localCenterB = new Vec2();

  public m_type = Joint.e_unknownJoint;
  public m_prev?: Joint;
  public m_next?: Joint;
  public m_bodyA?: Body;
  public m_bodyB?: Body;
  public m_collideConnected = false;
  public m_islandFlag = false;
  public m_userData?: any;

  constructor(def: JointDef) {
    b2Assert(def.bodyA !== def.bodyB);

    this.m_type = def.type;
    this.m_prev = undefined;
    this.m_next = undefined;
    this.m_bodyA = def.bodyA;
    this.m_bodyB = def.bodyB;
    this.m_collideConnected = def.collideConnected;
    this.m_islandFlag = false;
    this.m_userData = def.userData;
  }

  public GetType() {
    return this.m_type;
  }

  public GetAnchorA() {
    return new Vec2();
  }

  public GetAnchorB() {
    return new Vec2();
  }

  public GetReactionForce(inv_dt = 0) {
    return new Vec2();
  }

  public GetReactionTorque(inv_dt = 0) {
    return 0;
  }

  public GetBodyA() {
    return this.m_bodyA;
  }

  public GetBodyB() {
    return this.m_bodyB;
  }

  public GetNext() {
    return this.m_next;
  }

  public GetUserData() {
    return this.m_userData;
  }

  public SetUserData(data: any) {
    this.m_userData = data;
  }

  public IsActive() {
    return (
      this.m_bodyA &&
      this.m_bodyA.IsActive() &&
      this.m_bodyB &&
      this.m_bodyB.IsActive()
    );
  }

  public InitVelocityConstraints(step: TimeStep) {} // tslint:disable-line no-empty
  public SolveVelocityConstraints(step: TimeStep) {} // tslint:disable-line no-empty
  public FinalizeVelocityConstraints() {} // tslint:disable-line no-empty
  public SolvePositionConstraints(baumgarte = 0) {
    return false;
  }
}

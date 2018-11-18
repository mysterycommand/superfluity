// tslint:disable variable-name no-bitwise

import { b2_toiSlop, b2Assert } from '../common/settings';
import {
  AddVV,
  CrossFV,
  Dot,
  MulFV,
  MulMV,
  MulTMV,
  MulX,
  MulXT,
  SubtractVV,
} from '../common/math';
import Sweep from '../common/math/sweep';
import Transform from '../common/math/transform';
import Vec2 from '../common/math/vec2';
import World from './world';

import BodyDef from './body-def';
import EdgeShape from '../collision/shapes/edge-shape';
import Fixture from './fixture';
import Shape from '../collision/shapes/shape';
import FixtureDef from './fixture-def';
import MassData from '../collision/shapes/mass-data';

export default class Body {
  public static s_xf1 = new Transform();
  public static e_islandFlag = 0x0001;
  public static e_awakeFlag = 0x0002;
  public static e_allowSleepFlag = 0x0004;
  public static e_bulletFlag = 0x0008;
  public static e_fixedRotationFlag = 0x0010;
  public static e_activeFlag = 0x0020;
  public static b2_staticBody = 0;
  public static b2_kinematicBody = 1;
  public static b2_dynamicBody = 2;

  public m_xf = new Transform();
  public m_sweep = new Sweep();

  public m_linearVelocity = new Vec2();
  public m_angularVelocity = 0;
  public m_linearDamping = 0;
  public m_angularDamping = 0;

  public m_force = new Vec2();
  public m_torque = 0;

  public m_flags = 0;

  public m_jointList: any;
  public m_controllerList: any;
  public m_contactList: any;
  public m_controllerCount: any;

  public m_prev: any;
  public m_next: any;

  public m_sleepTime: any;

  public m_type: any;

  public m_mass: any;
  public m_invMass: any;

  public m_I: any;
  public m_invI: any;

  public m_inertiaScale: any;
  public m_fixtureList: any;
  public m_fixtureCount: any;
  public m_userData: any;

  public m_islandIndex = 0;

  constructor(bd: BodyDef, public m_world?: World) {
    this.m_flags = 0;

    if (bd.bullet) {
      this.m_flags |= Body.e_bulletFlag;
    }

    if (bd.fixedRotation) {
      this.m_flags |= Body.e_fixedRotationFlag;
    }

    if (bd.allowSleep) {
      this.m_flags |= Body.e_allowSleepFlag;
    }

    if (bd.awake) {
      this.m_flags |= Body.e_awakeFlag;
    }

    if (bd.active) {
      this.m_flags |= Body.e_activeFlag;
    }

    this.m_xf.position.SetV(bd.position);
    this.m_xf.R.Set(bd.angle);

    this.m_sweep.localCenter.SetZero();
    this.m_sweep.t0 = 1.0;
    this.m_sweep.a0 = this.m_sweep.a = bd.angle;

    const tMat = this.m_xf.R;
    const tVec = this.m_sweep.localCenter;

    this.m_sweep.c.x = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
    this.m_sweep.c.y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
    this.m_sweep.c.x += this.m_xf.position.x;
    this.m_sweep.c.y += this.m_xf.position.y;
    this.m_sweep.c0.SetV(this.m_sweep.c);

    this.m_jointList = null;
    this.m_controllerList = null;
    this.m_contactList = null;
    this.m_controllerCount = 0;

    this.m_prev = null;
    this.m_next = null;

    this.m_linearVelocity.SetV(bd.linearVelocity);
    this.m_angularVelocity = bd.angularVelocity;

    this.m_linearDamping = bd.linearDamping;
    this.m_angularDamping = bd.angularDamping;

    this.m_force.Set(0.0, 0.0);
    this.m_torque = 0.0;

    this.m_sleepTime = 0.0;
    this.m_type = bd.type;

    if (this.m_type === Body.b2_dynamicBody) {
      this.m_mass = 1.0;
      this.m_invMass = 1.0;
    } else {
      this.m_mass = 0.0;
      this.m_invMass = 0.0;
    }

    this.m_I = 0.0;
    this.m_invI = 0.0;

    this.m_inertiaScale = bd.inertiaScale;
    this.m_userData = bd.userData;

    this.m_fixtureList = null;
    this.m_fixtureCount = 0;
  }

  public connectEdges(s1: EdgeShape, s2: EdgeShape, angle1 = 0) {
    const angle2 = Math.atan2(
      s2.GetDirectionVector().y,
      s2.GetDirectionVector().x,
    );

    const coreOffset = Math.tan((angle2 - angle1) * 0.5);

    let core = MulFV(coreOffset, s2.GetDirectionVector());
    core = SubtractVV(core, s2.GetNormalVector());
    core = MulFV(b2_toiSlop, core);
    core = AddVV(core, s2.GetVertex1());

    const cornerDir = AddVV(s1.GetDirectionVector(), s2.GetDirectionVector());
    cornerDir.Normalize();

    const convex = Dot(s1.GetDirectionVector(), s2.GetNormalVector()) > 0.0;

    s1.SetNextEdge(s2, core, cornerDir, convex);
    s2.SetPrevEdge(s1, core, cornerDir, convex);

    return angle2;
  }

  public CreateFixture(def: FixtureDef) {
    if (!this.m_world || this.m_world.IsLocked()) {
      return;
    }

    const fixture = new Fixture();
    fixture.Create(this, this.m_xf, def);

    if (this.m_flags & Body.e_activeFlag) {
      const broadPhase = this.m_world.m_contactManager.m_broadPhase;
      fixture.CreateProxy(broadPhase, this.m_xf);
    }

    fixture.m_next = this.m_fixtureList;
    this.m_fixtureList = fixture;
    ++this.m_fixtureCount;

    fixture.m_body = this;
    if (fixture.m_density > 0.0) {
      this.ResetMassData();
    }

    this.m_world.m_flags |= World.e_newFixture;
    return fixture;
  }

  public CreateFixture2(shape: Shape, density = 0) {
    const def = new FixtureDef();

    def.shape = shape;
    def.density = density;

    return this.CreateFixture(def);
  }

  public DestroyFixture(fixture: Fixture) {
    if (!this.m_world || this.m_world.IsLocked()) {
      return;
    }

    let node = this.m_fixtureList;
    let ppF = null;

    while (node !== null) {
      if (node === fixture) {
        if (ppF) {
          ppF.m_next = fixture.m_next;
        } else {
          this.m_fixtureList = fixture.m_next;
        }
        break;
      }

      ppF = node;
      node = node.m_next;
    }

    let edge = this.m_contactList;
    while (edge) {
      const c = edge.contact;
      edge = edge.next;

      const fixtureA = c.GetFixtureA();
      const fixtureB = c.GetFixtureB();

      if (fixture === fixtureA || fixture === fixtureB) {
        this.m_world.m_contactManager.Destroy(c);
      }
    }

    if (this.m_flags & Body.e_activeFlag) {
      const broadPhase = this.m_world.m_contactManager.m_broadPhase;
      fixture.DestroyProxy(broadPhase);
    }

    fixture.Destroy();
    fixture.m_body = undefined;
    fixture.m_next = undefined;
    --this.m_fixtureCount;

    this.ResetMassData();
  }

  public SetPositionAndAngle(position: Vec2, angle = 0) {
    if (!this.m_world || this.m_world.IsLocked()) {
      return;
    }

    this.m_xf.R.Set(angle);
    this.m_xf.position.SetV(position);

    const tMat = this.m_xf.R;
    const tVec = this.m_sweep.localCenter;

    this.m_sweep.c.x = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
    this.m_sweep.c.y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

    this.m_sweep.c.x += this.m_xf.position.x;
    this.m_sweep.c.y += this.m_xf.position.y;

    this.m_sweep.c0.SetV(this.m_sweep.c);
    this.m_sweep.a0 = this.m_sweep.a = angle;

    const broadPhase = this.m_world.m_contactManager.m_broadPhase;
    for (let f = this.m_fixtureList; f; f = f.m_next) {
      f.Synchronize(broadPhase, this.m_xf, this.m_xf);
    }

    this.m_world.m_contactManager.FindNewContacts();
  }

  public SetTransform(xf: Transform) {
    this.SetPositionAndAngle(xf.position, xf.GetAngle());
  }

  public GetTransform() {
    return this.m_xf;
  }

  public GetPosition() {
    return this.m_xf.position;
  }

  public SetPosition(position: Vec2) {
    this.SetPositionAndAngle(position, this.GetAngle());
  }

  public GetAngle() {
    return this.m_sweep.a;
  }

  public SetAngle(angle = 0) {
    this.SetPositionAndAngle(this.GetPosition(), angle);
  }

  public GetWorldCenter() {
    return this.m_sweep.c;
  }

  public GetLocalCenter() {
    return this.m_sweep.localCenter;
  }

  public SetLinearVelocity(v: Vec2) {
    if (this.m_type === Body.b2_staticBody) {
      return;
    }

    this.m_linearVelocity.SetV(v);
  }

  public GetLinearVelocity() {
    return this.m_linearVelocity;
  }

  public SetAngularVelocity(omega = 0) {
    if (this.m_type === Body.b2_staticBody) {
      return;
    }

    this.m_angularVelocity = omega;
  }

  public GetAngularVelocity() {
    return this.m_angularVelocity;
  }

  public GetDefinition() {
    const bd = new BodyDef();

    bd.type = this.GetType();
    bd.allowSleep =
      (this.m_flags & Body.e_allowSleepFlag) === Body.e_allowSleepFlag;
    bd.angle = this.GetAngle();
    bd.angularDamping = this.m_angularDamping;
    bd.angularVelocity = this.m_angularVelocity;
    bd.fixedRotation =
      (this.m_flags & Body.e_fixedRotationFlag) === Body.e_fixedRotationFlag;
    bd.bullet = (this.m_flags & Body.e_bulletFlag) === Body.e_bulletFlag;
    bd.awake = (this.m_flags & Body.e_awakeFlag) === Body.e_awakeFlag;
    bd.linearDamping = this.m_linearDamping;
    bd.linearVelocity.SetV(this.GetLinearVelocity());
    bd.position = this.GetPosition();
    bd.userData = this.GetUserData();

    return bd;
  }

  public ApplyForce(force: Vec2, point: Vec2) {
    if (this.m_type !== Body.b2_dynamicBody) {
      return;
    }

    if (this.IsAwake() === false) {
      this.SetAwake(true);
    }

    this.m_force.x += force.x;
    this.m_force.y += force.y;
    this.m_torque +=
      (point.x - this.m_sweep.c.x) * force.y -
      (point.y - this.m_sweep.c.y) * force.x;
  }

  public ApplyTorque(torque = 0) {
    if (this.m_type !== Body.b2_dynamicBody) {
      return;
    }

    if (this.IsAwake() === false) {
      this.SetAwake(true);
    }

    this.m_torque += torque;
  }

  public ApplyImpulse(impulse: Vec2, point: Vec2) {
    if (this.m_type !== Body.b2_dynamicBody) {
      return;
    }

    if (this.IsAwake() === false) {
      this.SetAwake(true);
    }

    this.m_linearVelocity.x += this.m_invMass * impulse.x;
    this.m_linearVelocity.y += this.m_invMass * impulse.y;
    this.m_angularVelocity +=
      this.m_invI *
      ((point.x - this.m_sweep.c.x) * impulse.y -
        (point.y - this.m_sweep.c.y) * impulse.x);
  }

  public Split(cb: (f: Fixture) => boolean) {
    if (!this.m_world || this.m_world.IsLocked()) {
      return;
    }

    const linearVelocity = this.GetLinearVelocity().Copy();
    const angularVelocity = this.GetAngularVelocity();
    const center = this.GetWorldCenter();

    const body1 = this;
    const body2 = this.m_world.CreateBody(this.GetDefinition());

    if (!body2) {
      return;
    }

    let prev;
    for (let f = body1.m_fixtureList; f; ) {
      if (cb(f)) {
        const next = f.m_next;

        if (prev) {
          prev.m_next = next;
        } else {
          body1.m_fixtureList = next;
        }

        body1.m_fixtureCount--;
        f.m_next = body2.m_fixtureList;
        body2.m_fixtureList = f;
        body2.m_fixtureCount++;
        f.m_body = body2;

        f = next;
      } else {
        prev = f;
        f = f.m_next;
      }
    }

    body1.ResetMassData();
    body2.ResetMassData();

    const center1 = body1.GetWorldCenter();
    const center2 = body2.GetWorldCenter();

    const velocity1 = AddVV(
      linearVelocity,
      CrossFV(angularVelocity, SubtractVV(center1, center)),
    );
    const velocity2 = AddVV(
      linearVelocity,
      CrossFV(angularVelocity, SubtractVV(center2, center)),
    );

    body1.SetLinearVelocity(velocity1);
    body2.SetLinearVelocity(velocity2);

    body1.SetAngularVelocity(angularVelocity);
    body2.SetAngularVelocity(angularVelocity);

    body1.SynchronizeFixtures();
    body2.SynchronizeFixtures();

    return body2;
  }

  public Merge(other: Body) {
    const body1 = this;
    const body2 = other;

    for (let f = other.m_fixtureList; f; ) {
      const next = f.m_next;
      other.m_fixtureCount--;

      f.m_next = this.m_fixtureList;
      this.m_fixtureList = f;
      this.m_fixtureCount++;

      f.m_body = body2;
      f = next;
    }

    body1.m_fixtureCount = 0;
    // const center1 = body1.GetWorldCenter();
    // const center2 = body2.GetWorldCenter();
    // const velocity1 = body1.GetLinearVelocity().Copy();
    // const velocity2 = body2.GetLinearVelocity().Copy();
    // const angular1 = body1.GetAngularVelocity();
    // const angular = body2.GetAngularVelocity();

    body1.ResetMassData();
    this.SynchronizeFixtures();
  }

  public GetMass() {
    return this.m_mass;
  }

  public GetInertia() {
    return this.m_I;
  }

  public GetMassData(massData: MassData) {
    massData.mass = this.m_mass;
    massData.I = this.m_I;
    massData.center.SetV(this.m_sweep.localCenter);
  }

  public SetMassData(massData: MassData) {
    if (!this.m_world || this.m_world.IsLocked()) {
      return;
    }

    b2Assert(this.m_world.IsLocked() === false);

    if (this.m_type !== Body.b2_dynamicBody) {
      return;
    }

    this.m_invMass = 0.0;
    this.m_I = 0.0;
    this.m_invI = 0.0;
    this.m_mass = massData.mass;

    if (this.m_mass <= 0.0) {
      this.m_mass = 1.0;
    }

    this.m_invMass = 1.0 / this.m_mass;

    if (massData.I > 0.0 && (this.m_flags & Body.e_fixedRotationFlag) === 0) {
      this.m_I =
        massData.I -
        this.m_mass *
          (massData.center.x * massData.center.x +
            massData.center.y * massData.center.y);

      this.m_invI = 1.0 / this.m_I;
    }

    const oldCenter = this.m_sweep.c.Copy();

    this.m_sweep.localCenter.SetV(massData.center);
    this.m_sweep.c0.SetV(MulX(this.m_xf, this.m_sweep.localCenter));
    this.m_sweep.c.SetV(this.m_sweep.c0);

    this.m_linearVelocity.x +=
      this.m_angularVelocity * -(this.m_sweep.c.y - oldCenter.y);
    this.m_linearVelocity.y +=
      this.m_angularVelocity * +(this.m_sweep.c.x - oldCenter.x);
  }

  public ResetMassData() {
    this.m_mass = 0.0;
    this.m_invMass = 0.0;

    this.m_I = 0.0;
    this.m_invI = 0.0;

    this.m_sweep.localCenter.SetZero();

    if (
      this.m_type === Body.b2_staticBody ||
      this.m_type === Body.b2_kinematicBody
    ) {
      return;
    }

    const center = Vec2.Make(0, 0);
    for (let f = this.m_fixtureList; f; f = f.m_next) {
      if (f.m_density === 0.0) {
        continue;
      }

      const massData = f.GetMassData();
      this.m_mass += massData.mass;
      center.x += massData.center.x * massData.mass;
      center.y += massData.center.y * massData.mass;
      this.m_I += massData.I;
    }

    if (this.m_mass > 0.0) {
      this.m_invMass = 1.0 / this.m_mass;
      center.x *= this.m_invMass;
      center.y *= this.m_invMass;
    } else {
      this.m_mass = 1.0;
      this.m_invMass = 1.0;
    }

    if (this.m_I > 0.0 && (this.m_flags & Body.e_fixedRotationFlag) === 0) {
      this.m_I -= this.m_mass * (center.x * center.x + center.y * center.y);
      this.m_I *= this.m_inertiaScale;

      b2Assert(this.m_I > 0);

      this.m_invI = 1.0 / this.m_I;
    } else {
      this.m_I = 0.0;
      this.m_invI = 0.0;
    }

    const oldCenter = this.m_sweep.c.Copy();
    this.m_sweep.localCenter.SetV(center);
    this.m_sweep.c0.SetV(MulX(this.m_xf, this.m_sweep.localCenter));
    this.m_sweep.c.SetV(this.m_sweep.c0);

    this.m_linearVelocity.x +=
      this.m_angularVelocity * -(this.m_sweep.c.y - oldCenter.y);

    this.m_linearVelocity.y +=
      this.m_angularVelocity * +(this.m_sweep.c.x - oldCenter.x);
  }

  public GetWorldPoint(localPoint: Vec2) {
    const A = this.m_xf.R;
    const u = new Vec2(
      A.col1.x * localPoint.x + A.col2.x * localPoint.y,
      A.col1.y * localPoint.x + A.col2.y * localPoint.y,
    );

    u.x += this.m_xf.position.x;
    u.y += this.m_xf.position.y;

    return u;
  }

  public GetWorldVector(localVector: Vec2) {
    return MulMV(this.m_xf.R, localVector);
  }

  public GetLocalPoint(worldPoint: Vec2) {
    return MulXT(this.m_xf, worldPoint);
  }

  public GetLocalVector(worldVector: Vec2) {
    return MulTMV(this.m_xf.R, worldVector);
  }

  public GetLinearVelocityFromWorldPoint(worldPoint: Vec2) {
    return new Vec2(
      this.m_linearVelocity.x -
        this.m_angularVelocity * (worldPoint.y - this.m_sweep.c.y),
      this.m_linearVelocity.y +
        this.m_angularVelocity * (worldPoint.x - this.m_sweep.c.x),
    );
  }

  public GetLinearVelocityFromLocalPoint(localPoint: Vec2) {
    const A = this.m_xf.R;
    const worldPoint = new Vec2(
      A.col1.x * localPoint.x + A.col2.x * localPoint.y,
      A.col1.y * localPoint.x + A.col2.y * localPoint.y,
    );

    worldPoint.x += this.m_xf.position.x;
    worldPoint.y += this.m_xf.position.y;

    return new Vec2(
      this.m_linearVelocity.x -
        this.m_angularVelocity * (worldPoint.y - this.m_sweep.c.y),
      this.m_linearVelocity.y +
        this.m_angularVelocity * (worldPoint.x - this.m_sweep.c.x),
    );
  }

  public GetLinearDamping() {
    return this.m_linearDamping;
  }

  public SetLinearDamping(linearDamping = 0) {
    this.m_linearDamping = linearDamping;
  }

  public GetAngularDamping() {
    return this.m_angularDamping;
  }

  public SetAngularDamping(angularDamping = 0) {
    this.m_angularDamping = angularDamping;
  }

  public SetType(type = 0) {
    if (this.m_type === type) {
      return;
    }

    this.m_type = type;
    this.ResetMassData();

    if (this.m_type === Body.b2_staticBody) {
      this.m_linearVelocity.SetZero();
      this.m_angularVelocity = 0.0;
    }

    this.SetAwake(true);
    this.m_force.SetZero();
    this.m_torque = 0.0;

    for (let ce = this.m_contactList; ce; ce = ce.next) {
      ce.contact.FlagForFiltering();
    }
  }

  public GetType() {
    return this.m_type;
  }

  public SetBullet(flag: boolean) {
    if (flag) {
      this.m_flags |= Body.e_bulletFlag;
    } else {
      this.m_flags &= ~Body.e_bulletFlag;
    }
  }

  public IsBullet() {
    return (this.m_flags & Body.e_bulletFlag) === Body.e_bulletFlag;
  }

  public SetSleepingAllowed(flag: boolean) {
    if (flag) {
      this.m_flags |= Body.e_allowSleepFlag;
    } else {
      this.m_flags &= ~Body.e_allowSleepFlag;
      this.SetAwake(true);
    }
  }

  public SetAwake(flag: boolean) {
    if (flag) {
      this.m_flags |= Body.e_awakeFlag;
      this.m_sleepTime = 0.0;
    } else {
      this.m_flags &= ~Body.e_awakeFlag;
      this.m_sleepTime = 0.0;
      this.m_linearVelocity.SetZero();
      this.m_angularVelocity = 0.0;
      this.m_force.SetZero();
      this.m_torque = 0.0;
    }
  }

  public IsAwake() {
    return (this.m_flags & Body.e_awakeFlag) === Body.e_awakeFlag;
  }

  public SetFixedRotation(fixed: boolean) {
    if (fixed) {
      this.m_flags |= Body.e_fixedRotationFlag;
    } else {
      this.m_flags &= ~Body.e_fixedRotationFlag;
    }

    this.ResetMassData();
  }

  public IsFixedRotation() {
    return (
      (this.m_flags & Body.e_fixedRotationFlag) === Body.e_fixedRotationFlag
    );
  }

  public SetActive(flag: boolean) {
    if (flag === this.IsActive()) {
      return;
    }

    if (!this.m_world || this.m_world.IsLocked()) {
      return;
    }

    const broadPhase = this.m_world.m_contactManager.m_broadPhase;

    if (flag) {
      this.m_flags |= Body.e_activeFlag;
      for (let f = this.m_fixtureList; f; f = f.m_next) {
        f.CreateProxy(broadPhase, this.m_xf);
      }
    } else {
      this.m_flags &= ~Body.e_activeFlag;
      for (let f = this.m_fixtureList; f; f = f.m_next) {
        f.DestroyProxy(broadPhase);
      }

      let ce = this.m_contactList;
      while (ce) {
        const ce0 = ce;
        ce = ce.next;
        this.m_world.m_contactManager.Destroy(ce0.contact);
      }

      this.m_contactList = null;
    }
  }

  public IsActive() {
    return (this.m_flags & Body.e_activeFlag) === Body.e_activeFlag;
  }

  public IsSleepingAllowed() {
    return (this.m_flags & Body.e_allowSleepFlag) === Body.e_allowSleepFlag;
  }

  public GetFixtureList() {
    return this.m_fixtureList;
  }

  public GetJointList() {
    return this.m_jointList;
  }

  public GetControllerList() {
    return this.m_controllerList;
  }

  public GetContactList() {
    return this.m_contactList;
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

  public GetWorld() {
    return this.m_world;
  }

  public SynchronizeFixtures() {
    if (!this.m_world || this.m_world.IsLocked()) {
      return;
    }

    const xf1 = Body.s_xf1;
    xf1.R.Set(this.m_sweep.a0);

    const tMat = xf1.R;
    const tVec = this.m_sweep.localCenter;

    xf1.position.x =
      this.m_sweep.c0.x - (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);

    xf1.position.y =
      this.m_sweep.c0.y - (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

    const broadPhase = this.m_world.m_contactManager.m_broadPhase;
    for (let f = this.m_fixtureList; f; f = f.m_next) {
      f.Synchronize(broadPhase, xf1, this.m_xf);
    }
  }

  public SynchronizeTransform() {
    this.m_xf.R.Set(this.m_sweep.a);

    const tMat = this.m_xf.R;
    const tVec = this.m_sweep.localCenter;

    this.m_xf.position.x =
      this.m_sweep.c.x - (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);

    this.m_xf.position.y =
      this.m_sweep.c.y - (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
  }

  public ShouldCollide(other: Body) {
    if (
      this.m_type !== Body.b2_dynamicBody &&
      other.m_type !== Body.b2_dynamicBody
    ) {
      return false;
    }

    for (let jn = this.m_jointList; jn; jn = jn.next) {
      if (jn.other === other) {
        if (jn.joint.m_collideConnected === false) {
          return false;
        }
      }
    }

    return true;
  }

  public Advance(t = 0) {
    this.m_sweep.Advance(t);
    this.m_sweep.c.SetV(this.m_sweep.c0);
    this.m_sweep.a = this.m_sweep.a0;
    this.SynchronizeTransform();
  }
}

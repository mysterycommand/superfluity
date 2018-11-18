// tslint:disable variable-name no-bitwise

import Color from '../common/color';
import { MulX } from '../common/math';
import Sweep from '../common/math/sweep';
import Transform from '../common/math/transform';
import Vec2 from '../common/math/vec2';
import DebugDraw from './debug-draw';
import TimeStep from './time-step';
import ContactManager from './contact-manager';
import ContactSolver from './contacts/contact-solver';
import Island from './island';
import BodyDef from './body-def';
import DynamicTreeBroadPhase from '../collision/dynamic-tree-broad-phase';
import Body from './body';
import Contact from './contacts/contact';

import JointDef from './joints/joint-def';
import Joint from './joints/joint';
import { Create } from './joints/joint-factory';
// import PulleyJoint from './joints/pulley-joint';
import Controller from './controllers/controller';
import DistanceProxy from '../collision/distance-proxy';
import Aabb from '../collision/aabb';
import Shape from '../collision/shapes/shape';
import Fixture from './fixture';
import {
  b2_linearSlop,
  b2_maxTOIContactsPerIsland,
  b2_maxTOIJointsPerIsland,
  b2Assert,
} from '../common/settings';
import RayCastOutput from '../collision/ray-cast-output';
import RayCastInput from '../collision/ray-cast-input';
import CircleShape from '../collision/shapes/circle-shape';
import PolygonShape from '../collision/shapes/polygon-shape';
import EdgeShape from '../collision/shapes/edge-shape';

export default class World {
  public static s_timestep2 = new TimeStep();
  public static s_xf = new Transform();
  public static s_backupA = new Sweep();
  public static s_backupB = new Sweep();
  public static s_timestep = new TimeStep();
  public static s_queue = new Array();
  public static s_jointColor = new Color(0.5, 0.8, 0.8);

  public static e_newFixture = 0x0001;
  public static e_locked = 0x0002;
  public static m_warmStarting = true;
  public static m_continuousPhysics = true;

  public m_destructionListener?: any;
  public m_debugDraw?: DebugDraw;
  public m_bodyList?: Body;
  public m_contactList?: Contact;
  public m_jointList?: any;
  public m_controllerList?: any;

  public m_bodyCount = 0;
  public m_contactCount = 0;
  public m_jointCount = 0;
  public m_controllerCount = 0;
  public m_allowSleep = true;
  public m_gravity = new Vec2();
  public m_inv_dt0 = 0;
  public m_flags = 0;

  public m_contactManager = new ContactManager();
  public m_contactSolver = new ContactSolver();
  public m_island = new Island();
  public m_groundBody = this.CreateBody(new BodyDef());

  public s_stack: any[] = [];

  constructor(gravity: Vec2, doSleep: boolean) {
    this.m_gravity = gravity;
    this.m_allowSleep = doSleep;

    this.m_contactManager.m_world = this;
  }

  public SetDestructionListener(listener: any) {
    this.m_destructionListener = listener;
  }

  public SetContactFilter(filter: any) {
    this.m_contactManager.m_contactFilter = filter;
  }

  public SetContactListener(listener: any) {
    this.m_contactManager.m_contactListener = listener;
  }

  public SetDebugDraw(debugDraw: DebugDraw) {
    this.m_debugDraw = debugDraw;
  }

  public SetBroadPhase(broadPhase: DynamicTreeBroadPhase) {
    const oldBroadPhase = this.m_contactManager.m_broadPhase;

    this.m_contactManager.m_broadPhase = broadPhase;
    for (let b = this.m_bodyList; b; b = b.m_next) {
      for (let f = b.m_fixtureList; f; f = f.m_next) {
        f.m_proxy = broadPhase.CreateProxy(
          oldBroadPhase.GetFatAABB(f.m_proxy),
          f,
        );
      }
    }
  }

  public Validate() {
    this.m_contactManager.m_broadPhase.Validate();
  }

  public GetProxyCount() {
    return this.m_contactManager.m_broadPhase.GetProxyCount();
  }

  public CreateBody(def: BodyDef) {
    if (this.IsLocked()) {
      throw new Error('Cannot create bodies on a locked world.');
    }

    const b = new Body(def, this);
    b.m_prev = null;
    b.m_next = this.m_bodyList;

    if (this.m_bodyList) {
      this.m_bodyList.m_prev = b;
    }

    this.m_bodyList = b;
    ++this.m_bodyCount;
    return b;
  }

  public DestroyBody(b: Body) {
    if (this.IsLocked()) {
      return;
    }

    let jn = b.m_jointList;
    while (jn) {
      const jn0 = jn;
      jn = jn.next;

      if (!this.m_destructionListener) {
        continue;
      }

      this.m_destructionListener.SayGoodbyeJoint(jn0.joint);
      this.DestroyJoint(jn0.joint);
    }

    let coe = b.m_controllerList;
    while (coe) {
      const coe0 = coe;
      coe = coe.nextController;
      coe0.controller.RemoveBody(b);
    }

    let ce = b.m_contactList;
    while (ce) {
      const ce0 = ce;
      ce = ce.next;
      this.m_contactManager.Destroy(ce0.contact);
    }

    b.m_contactList = null;

    let f = b.m_fixtureList;
    while (f) {
      const f0 = f;
      f = f.m_next;

      if (!this.m_destructionListener) {
        continue;
      }

      this.m_destructionListener.SayGoodbyeFixture(f0);
      f0.DestroyProxy(this.m_contactManager.m_broadPhase);
      f0.Destroy();
    }

    b.m_fixtureList = null;
    b.m_fixtureCount = 0;

    if (b.m_prev) {
      b.m_prev.m_next = b.m_next;
    }

    if (b.m_next) {
      b.m_next.m_prev = b.m_prev;
    }

    if (b === this.m_bodyList) {
      this.m_bodyList = b.m_next;
    }

    --this.m_bodyCount;
  }

  public CreateJoint(def: JointDef) {
    if (!(def.bodyA && def.bodyB)) {
      return;
    }

    const j = Create(def, null);
    if (!(j.m_bodyA && j.m_bodyB)) {
      return;
    }

    j.m_prev = undefined;
    j.m_next = this.m_jointList;

    if (this.m_jointList) {
      this.m_jointList.m_prev = j;
    }

    this.m_jointList = j;
    ++this.m_jointCount;

    j.m_edgeA.joint = j;
    j.m_edgeA.other = j.m_bodyB;
    j.m_edgeA.prev = undefined;
    j.m_edgeA.next = j.m_bodyA.m_jointList;

    if (j.m_bodyA.m_jointList) {
      j.m_bodyA.m_jointList.prev = j.m_edgeA;
    }

    j.m_bodyA.m_jointList = j.m_edgeA;
    j.m_edgeB.joint = j;
    j.m_edgeB.other = j.m_bodyA;
    j.m_edgeB.prev = undefined;
    j.m_edgeB.next = j.m_bodyB.m_jointList;

    if (j.m_bodyB.m_jointList) {
      j.m_bodyB.m_jointList.prev = j.m_edgeB;
    }

    j.m_bodyB.m_jointList = j.m_edgeB;
    const bodyA = def.bodyA;
    const bodyB = def.bodyB;

    if (def.collideConnected === false) {
      let edge = bodyB.GetContactList();
      while (edge) {
        if (edge.other === bodyA) {
          edge.contact.FlagForFiltering();
        }
        edge = edge.next;
      }
    }

    return j;
  }

  public DestroyJoint(j: Joint) {
    const collideConnected = j.m_collideConnected;

    if (j.m_prev) {
      j.m_prev.m_next = j.m_next;
    }

    if (j.m_next) {
      j.m_next.m_prev = j.m_prev;
    }

    if (j === this.m_jointList) {
      this.m_jointList = j.m_next;
    }

    const bodyA = j.m_bodyA;
    const bodyB = j.m_bodyB;

    if (!(bodyA && bodyB)) {
      return;
    }

    bodyA.SetAwake(true);
    bodyB.SetAwake(true);

    if (j.m_edgeA.prev) {
      j.m_edgeA.prev.next = j.m_edgeA.next;
    }

    if (j.m_edgeA.next) {
      j.m_edgeA.next.prev = j.m_edgeA.prev;
    }

    if (j.m_edgeA === bodyA.m_jointList) {
      bodyA.m_jointList = j.m_edgeA.next;
    }

    j.m_edgeA.prev = undefined;
    j.m_edgeA.next = undefined;

    if (j.m_edgeB.prev) {
      j.m_edgeB.prev.next = j.m_edgeB.next;
    }

    if (j.m_edgeB.next) {
      j.m_edgeB.next.prev = j.m_edgeB.prev;
    }

    if (j.m_edgeB === bodyB.m_jointList) {
      bodyB.m_jointList = j.m_edgeB.next;
    }

    j.m_edgeB.prev = undefined;
    j.m_edgeB.next = undefined;

    Joint.Destroy(j, null);
    --this.m_jointCount;

    if (collideConnected === false) {
      let edge = bodyB.GetContactList();
      while (edge) {
        if (edge.other === bodyA) {
          edge.contact.FlagForFiltering();
        }
        edge = edge.next;
      }
    }
  }

  public AddController(c: Controller) {
    c.m_next = this.m_controllerList;
    c.m_prev = null;

    this.m_controllerList = c;
    c.m_world = this;

    this.m_controllerCount++;
    return c;
  }

  public RemoveController(c: Controller) {
    if (c.m_prev) {
      c.m_prev.m_next = c.m_next;
    }

    if (c.m_next) {
      c.m_next.m_prev = c.m_prev;
    }

    if (this.m_controllerList === c) {
      this.m_controllerList = c.m_next;
    }

    this.m_controllerCount--;
  }

  public CreateController(controller: Controller) {
    if (controller.m_world !== this) {
      throw new Error('Controller can only be a member of one world');
    }

    controller.m_next = this.m_controllerList;
    controller.m_prev = null;

    if (this.m_controllerList) {
      this.m_controllerList.m_prev = controller;
    }

    this.m_controllerList = controller;
    ++this.m_controllerCount;

    controller.m_world = this;
    return controller;
  }

  public DestroyController(controller: Controller) {
    controller.Clear();

    if (controller.m_next) {
      controller.m_next.m_prev = controller.m_prev;
    }

    if (controller.m_prev) {
      controller.m_prev.m_next = controller.m_next;
    }

    if (controller === this.m_controllerList) {
      this.m_controllerList = controller.m_next;
    }

    --this.m_controllerCount;
  }

  public SetWarmStarting(flag: boolean) {
    World.m_warmStarting = flag;
  }

  public SetContinuousPhysics(flag: boolean) {
    World.m_continuousPhysics = flag;
  }

  public GetBodyCount() {
    return this.m_bodyCount;
  }

  public GetJointCount() {
    return this.m_jointCount;
  }

  public GetContactCount() {
    return this.m_contactCount;
  }

  public SetGravity(gravity: Vec2) {
    this.m_gravity = gravity;
  }

  public GetGravity() {
    return this.m_gravity;
  }

  public GetGroundBody() {
    return this.m_groundBody;
  }

  public Step(dt = 0, velocityIterations = 0, positionIterations = 0) {
    if (this.m_flags & World.e_newFixture) {
      this.m_contactManager.FindNewContacts();
      this.m_flags &= ~World.e_newFixture;
    }

    this.m_flags |= World.e_locked;
    const step = World.s_timestep2;

    step.dt = dt;
    step.velocityIterations = velocityIterations;
    step.positionIterations = positionIterations;

    if (dt > 0.0) {
      step.inv_dt = 1.0 / dt;
    } else {
      step.inv_dt = 0.0;
    }

    step.dtRatio = this.m_inv_dt0 * dt;
    step.warmStarting = World.m_warmStarting;

    this.m_contactManager.Collide();
    if (step.dt > 0.0) {
      this.Solve(step);
    }

    if (World.m_continuousPhysics && step.dt > 0.0) {
      this.SolveTOI(step);
    }

    if (step.dt > 0.0) {
      this.m_inv_dt0 = step.inv_dt;
    }

    this.m_flags &= ~World.e_locked;
  }

  public ClearForces() {
    for (let body = this.m_bodyList; body; body = body.m_next) {
      body.m_force.SetZero();
      body.m_torque = 0.0;
    }
  }

  public DrawDebugData() {
    if (!this.m_debugDraw) {
      return;
    }

    this.m_debugDraw.m_sprite.graphics.clear();

    const flags = this.m_debugDraw.GetFlags();
    let b;
    let f;
    let s;
    let j;
    let bp;
    let xf;
    let vs = [new Vec2(), new Vec2(), new Vec2(), new Vec2()];
    const color = new Color(0, 0, 0);

    if (flags & DebugDraw.e_shapeBit) {
      for (b = this.m_bodyList; b; b = b.m_next) {
        xf = b.m_xf;

        for (f = b.GetFixtureList(); f; f = f.m_next) {
          s = f.GetShape();

          if (b.IsActive() === false) {
            color.Set(0.5, 0.5, 0.3);
            this.DrawShape(s, xf, color);
          } else if (b.GetType() === Body.b2_staticBody) {
            color.Set(0.5, 0.9, 0.5);
            this.DrawShape(s, xf, color);
          } else if (b.GetType() === Body.b2_kinematicBody) {
            color.Set(0.5, 0.5, 0.9);
            this.DrawShape(s, xf, color);
          } else if (b.IsAwake() === false) {
            color.Set(0.6, 0.6, 0.6);
            this.DrawShape(s, xf, color);
          } else {
            color.Set(0.9, 0.7, 0.7);
            this.DrawShape(s, xf, color);
          }
        }
      }
    }

    if (flags & DebugDraw.e_jointBit) {
      for (j = this.m_jointList; j; j = j.m_next) {
        this.DrawJoint(j);
      }
    }

    if (flags & DebugDraw.e_controllerBit) {
      for (let c = this.m_controllerList; c; c = c.m_next) {
        c.Draw(this.m_debugDraw);
      }
    }

    if (flags & DebugDraw.e_pairBit) {
      color.Set(0.3, 0.9, 0.9);

      for (
        let contact = this.m_contactManager.m_contactList;
        contact;
        contact = contact.GetNext()
      ) {
        const fixtureA = contact.GetFixtureA();
        const fixtureB = contact.GetFixtureB();

        if (!(fixtureA && fixtureB)) {
          continue;
        }

        const cA = fixtureA.GetAABB().GetCenter();
        const cB = fixtureB.GetAABB().GetCenter();

        this.m_debugDraw.DrawSegment(cA, cB, color);
      }
    }

    if (flags & DebugDraw.e_aabbBit) {
      bp = this.m_contactManager.m_broadPhase;
      vs = [new Vec2(), new Vec2(), new Vec2(), new Vec2()];

      for (b = this.m_bodyList; b; b = b.GetNext()) {
        if (!b.IsActive()) {
          continue;
        }

        for (f = b.GetFixtureList(); f; f = f.GetNext()) {
          const aabb = bp.GetFatAABB(f.m_proxy);

          vs[0].Set(aabb.lowerBound.x, aabb.lowerBound.y);
          vs[1].Set(aabb.upperBound.x, aabb.lowerBound.y);
          vs[2].Set(aabb.upperBound.x, aabb.upperBound.y);
          vs[3].Set(aabb.lowerBound.x, aabb.upperBound.y);

          this.m_debugDraw.DrawPolygon(vs, 4, color);
        }
      }
    }

    if (flags & DebugDraw.e_centerOfMassBit) {
      for (b = this.m_bodyList; b; b = b.m_next) {
        xf = World.s_xf;
        xf.R = b.m_xf.R;
        xf.position = b.GetWorldCenter();

        this.m_debugDraw.DrawTransform(xf);
      }
    }
  }

  public QueryAABB(cb: (proxy: DistanceProxy) => boolean, aabb: Aabb) {
    const broadPhase = this.m_contactManager.m_broadPhase;
    broadPhase.Query(proxy => cb(broadPhase.GetUserData(proxy)), aabb);
  }

  public QueryShape(
    cb: (fixture: Fixture) => boolean,
    shape: Shape,
    transform: Transform,
  ) {
    if (!transform) {
      transform = new Transform();
      transform.SetIdentity();
    }

    const broadPhase = this.m_contactManager.m_broadPhase;
    const aabb = new Aabb();
    shape.ComputeAABB(aabb, transform);

    broadPhase.Query(proxy => {
      const fixture =
        broadPhase.GetUserData(proxy) instanceof Fixture
          ? broadPhase.GetUserData(proxy)
          : null;

      return Shape.TestOverlap(
        shape,
        transform,
        fixture.GetShape(),
        fixture.GetBody().GetTransform(),
      )
        ? cb(fixture)
        : true;
    }, aabb);
  }

  public QueryPoint(cb: (fixture: Fixture) => boolean, p: Vec2) {
    const broadPhase = this.m_contactManager.m_broadPhase;

    const aabb = new Aabb();
    aabb.lowerBound.Set(p.x - b2_linearSlop, p.y - b2_linearSlop);
    aabb.upperBound.Set(p.x + b2_linearSlop, p.y + b2_linearSlop);

    broadPhase.Query(proxy => {
      const fixture =
        broadPhase.GetUserData(proxy) instanceof Fixture
          ? broadPhase.GetUserData(proxy)
          : null;

      return fixture.TestPoint(p) ? cb(fixture) : true;
    }, aabb);
  }

  public RayCast(
    cb: (
      fixture: Fixture,
      point: Vec2,
      normal: Vec2,
      fraction: number,
    ) => number,
    point1: Vec2,
    point2: Vec2,
  ) {
    const broadPhase = this.m_contactManager.m_broadPhase;

    const output = new RayCastOutput();
    const input = new RayCastInput(point1, point2);

    broadPhase.RayCast((rcInput, proxy) => {
      const userData = broadPhase.GetUserData(proxy);

      if (!(userData instanceof Fixture)) {
        return rcInput.maxFraction;
      }

      const hit = userData.RayCast(output, rcInput);
      if (hit) {
        const fraction = output.fraction;
        const point = new Vec2(
          (1.0 - fraction) * point1.x + fraction * point2.x,
          (1.0 - fraction) * point1.y + fraction * point2.y,
        );

        return cb(userData, point, output.normal, fraction);
      }
    }, input);
  }

  public RayCastOne(point1: Vec2, point2: Vec2) {
    let result;

    this.RayCast(
      (fixture: Fixture, point: Vec2, normal: Vec2, fraction = 0) => {
        result = fixture;
        return fraction;
      },
      point1,
      point2,
    );

    return result;
  }

  public RayCastAll(point1: Vec2, point2: Vec2) {
    const result = new Array();

    this.RayCast(
      (fixture: Fixture, point: Vec2, normal: Vec2, fraction = 0) => {
        result[result.length] = fixture;
        return 1;
      },
      point1,
      point2,
    );

    return result;
  }

  public GetBodyList() {
    return this.m_bodyList;
  }

  public GetJointList() {
    return this.m_jointList;
  }

  public GetContactList() {
    return this.m_contactList;
  }

  public IsLocked() {
    return (this.m_flags & World.e_locked) > 0;
  }

  public Solve(step: TimeStep) {
    let b;

    for (
      let controller = this.m_controllerList;
      controller;
      controller = controller.m_next
    ) {
      controller.Step(step);
    }

    const island = this.m_island;
    island.Initialize(
      this.m_bodyCount,
      this.m_contactCount,
      this.m_jointCount,
      null,
      this.m_contactManager.m_contactListener,
      this.m_contactSolver,
    );

    for (b = this.m_bodyList; b; b = b.m_next) {
      b.m_flags &= ~Body.e_islandFlag;
    }

    for (let c = this.m_contactList; c; c = c.m_next) {
      c.m_flags &= ~Contact.e_islandFlag;
    }

    for (let j = this.m_jointList; j; j = j.m_next) {
      j.m_islandFlag = false;
    }

    const stack = this.s_stack;
    for (let seed = this.m_bodyList; seed; seed = seed.m_next) {
      if (seed.m_flags & Body.e_islandFlag) {
        continue;
      }

      if (seed.IsAwake() === false || seed.IsActive() === false) {
        continue;
      }

      if (seed.GetType() === Body.b2_staticBody) {
        continue;
      }

      island.Clear();

      let stackCount = 0;
      stack[stackCount++] = seed;
      seed.m_flags |= Body.e_islandFlag;

      while (stackCount > 0) {
        b = stack[--stackCount];
        island.AddBody(b);

        if (b.IsAwake() === false) {
          b.SetAwake(true);
        }

        if (b.GetType() === Body.b2_staticBody) {
          continue;
        }

        let other;
        for (let ce = b.m_contactList; ce; ce = ce.next) {
          if (ce.contact.m_flags & Contact.e_islandFlag) {
            continue;
          }

          if (
            ce.contact.IsSensor() === true ||
            ce.contact.IsEnabled() === false ||
            ce.contact.IsTouching() === false
          ) {
            continue;
          }

          island.AddContact(ce.contact);
          ce.contact.m_flags |= Contact.e_islandFlag;
          other = ce.other;

          if (other.m_flags & Body.e_islandFlag) {
            continue;
          }

          stack[stackCount++] = other;
          other.m_flags |= Body.e_islandFlag;
        }

        for (let jn = b.m_jointList; jn; jn = jn.next) {
          if (jn.joint.m_islandFlag === true) {
            continue;
          }

          other = jn.other;
          if (other.IsActive() === false) {
            continue;
          }

          island.AddJoint(jn.joint);
          jn.joint.m_islandFlag = true;

          if (other.m_flags & Body.e_islandFlag) {
            continue;
          }

          stack[stackCount++] = other;
          other.m_flags |= Body.e_islandFlag;
        }
      }

      island.Solve(step, this.m_gravity, this.m_allowSleep);

      for (let i = 0; i < island.m_bodyCount; ++i) {
        b = island.m_bodies[i];

        if (b.GetType() === Body.b2_staticBody) {
          b.m_flags &= ~Body.e_islandFlag;
        }
      }
    }

    for (let i = 0; i < stack.length; ++i) {
      if (!stack[i]) {
        break;
      }

      stack[i] = null;
    }

    for (b = this.m_bodyList; b; b = b.m_next) {
      if (b.IsAwake() === false || b.IsActive() === false) {
        continue;
      }

      if (b.GetType() === Body.b2_staticBody) {
        continue;
      }

      b.SynchronizeFixtures();
    }

    this.m_contactManager.FindNewContacts();
  }

  public SolveTOI(step: TimeStep) {
    let b;
    let fA;
    let fB;
    let bA;
    let bB;
    let cEdge;
    let j;

    const island = this.m_island;
    island.Initialize(
      this.m_bodyCount,
      b2_maxTOIContactsPerIsland,
      b2_maxTOIJointsPerIsland,
      null,
      this.m_contactManager.m_contactListener,
      this.m_contactSolver,
    );

    const queue = World.s_queue;
    for (b = this.m_bodyList; b; b = b.m_next) {
      b.m_flags &= ~Body.e_islandFlag;
      b.m_sweep.t0 = 0.0;
    }

    let c;
    for (c = this.m_contactList; c; c = c.m_next) {
      c.m_flags &= ~(Contact.e_toiFlag | Contact.e_islandFlag);
    }

    for (j = this.m_jointList; j; j = j.m_next) {
      j.m_islandFlag = false;
    }

    for (;;) {
      let minContact = null;
      let minTOI = 1.0;

      for (c = this.m_contactList; c; c = c.m_next) {
        if (
          c.IsSensor() === true ||
          c.IsEnabled() === false ||
          c.IsContinuous() === false
        ) {
          continue;
        }

        let toi = 1;
        if (c.m_flags & Contact.e_toiFlag) {
          toi = c.m_toi;
        } else {
          fA = c.m_fixtureA as Fixture;
          fB = c.m_fixtureB as Fixture;

          bA = fA.m_body as Body;
          bB = fB.m_body as Body;

          if (
            (bA.GetType() !== Body.b2_dynamicBody || bA.IsAwake() === false) &&
            (bB.GetType() !== Body.b2_dynamicBody || bB.IsAwake() === false)
          ) {
            continue;
          }

          let t0 = bA.m_sweep.t0;
          if (bA.m_sweep.t0 < bB.m_sweep.t0) {
            t0 = bB.m_sweep.t0;
            bA.m_sweep.Advance(t0);
          } else if (bB.m_sweep.t0 < bA.m_sweep.t0) {
            t0 = bA.m_sweep.t0;
            bB.m_sweep.Advance(t0);
          }

          toi = c.ComputeTOI(bA.m_sweep, bB.m_sweep);
          b2Assert(0.0 <= toi && toi <= 1.0);

          if (toi > 0.0 && toi < 1.0) {
            toi = (1.0 - toi) * t0 + toi;
            if (toi > 1) {
              toi = 1;
            }
          }

          c.m_toi = toi;
          c.m_flags |= Contact.e_toiFlag;
        }

        if (Number.MIN_VALUE < toi && toi < minTOI) {
          minContact = c;
          minTOI = toi;
        }
      }

      if (minContact === null || 1.0 - 100.0 * Number.MIN_VALUE < minTOI) {
        break;
      }

      fA = minContact.m_fixtureA as Fixture;
      fB = minContact.m_fixtureB as Fixture;

      bA = fA.m_body as Body;
      bB = fB.m_body as Body;

      World.s_backupA.Set(bA.m_sweep);
      World.s_backupB.Set(bB.m_sweep);

      bA.Advance(minTOI);
      bB.Advance(minTOI);

      minContact.Update(this.m_contactManager.m_contactListener);
      minContact.m_flags &= ~Contact.e_toiFlag;

      if (minContact.IsSensor() === true || minContact.IsEnabled() === false) {
        bA.m_sweep.Set(World.s_backupA);
        bB.m_sweep.Set(World.s_backupB);

        bA.SynchronizeTransform();
        bB.SynchronizeTransform();
        continue;
      }

      if (minContact.IsTouching() === false) {
        continue;
      }

      let seed = bA;
      if (seed.GetType() !== Body.b2_dynamicBody) {
        seed = bB;
      }

      island.Clear();

      let queueStart = 0;
      let queueSize = 0;

      queue[queueStart + queueSize++] = seed;
      seed.m_flags |= Body.e_islandFlag;

      while (queueSize > 0) {
        b = queue[queueStart++];
        --queueSize;
        island.AddBody(b);

        if (b.IsAwake() === false) {
          b.SetAwake(true);
        }

        if (b.GetType() !== Body.b2_dynamicBody) {
          continue;
        }

        for (cEdge = b.m_contactList; cEdge; cEdge = cEdge.next) {
          if (island.m_contactCount === island.m_contactCapacity) {
            break;
          }

          if (cEdge.contact.m_flags & Contact.e_islandFlag) {
            continue;
          }

          if (
            cEdge.contact.IsSensor() === true ||
            cEdge.contact.IsEnabled() === false ||
            cEdge.contact.IsTouching() === false
          ) {
            continue;
          }

          island.AddContact(cEdge.contact);
          cEdge.contact.m_flags |= Contact.e_islandFlag;
          const other = cEdge.other;

          if (other.m_flags & Body.e_islandFlag) {
            continue;
          }

          if (other.GetType() !== Body.b2_staticBody) {
            other.Advance(minTOI);
            other.SetAwake(true);
          }

          queue[queueStart + queueSize] = other;
          ++queueSize;
          other.m_flags |= Body.e_islandFlag;
        }

        for (let jEdge = b.m_jointList; jEdge; jEdge = jEdge.next) {
          if (island.m_jointCount === island.m_jointCapacity) {
            continue;
          }

          if (jEdge.joint.m_islandFlag === true) {
            continue;
          }

          const other = jEdge.other;
          if (other.IsActive() === false) {
            continue;
          }

          island.AddJoint(jEdge.joint);
          jEdge.joint.m_islandFlag = true;

          if (other.m_flags & Body.e_islandFlag) {
            continue;
          }

          if (other.GetType() !== Body.b2_staticBody) {
            other.Advance(minTOI);
            other.SetAwake(true);
          }

          queue[queueStart + queueSize] = other;
          ++queueSize;
          other.m_flags |= Body.e_islandFlag;
        }
      }

      const subStep = World.s_timestep;
      subStep.warmStarting = false;
      subStep.dt = (1.0 - minTOI) * step.dt;
      subStep.inv_dt = 1.0 / subStep.dt;
      subStep.dtRatio = 0.0;
      subStep.velocityIterations = step.velocityIterations;
      subStep.positionIterations = step.positionIterations;

      island.SolveTOI(subStep);

      for (let i = 0; i < island.m_bodyCount; ++i) {
        b = island.m_bodies[i];
        b.m_flags &= ~Body.e_islandFlag;

        if (b.IsAwake() === false) {
          continue;
        }

        if (b.GetType() !== Body.b2_dynamicBody) {
          continue;
        }

        b.SynchronizeFixtures();
        for (cEdge = b.m_contactList; cEdge; cEdge = cEdge.next) {
          cEdge.contact.m_flags &= ~Contact.e_toiFlag;
        }
      }

      for (let i = 0; i < island.m_contactCount; ++i) {
        c = island.m_contacts[i];
        c.m_flags &= ~(Contact.e_toiFlag | Contact.e_islandFlag);
      }

      for (let i = 0; i < island.m_jointCount; ++i) {
        j = island.m_joints[i];
        j.m_islandFlag = false;
      }

      this.m_contactManager.FindNewContacts();
    }
  }

  public DrawJoint(joint: Joint) {
    if (!this.m_debugDraw) {
      return;
    }

    const b1 = joint.GetBodyA();
    const b2 = joint.GetBodyB();

    if (!(b1 && b2)) {
      return;
    }

    const xf1 = b1.m_xf;
    const xf2 = b2.m_xf;

    const x1 = xf1.position;
    const x2 = xf2.position;

    const p1 = joint.GetAnchorA();
    const p2 = joint.GetAnchorB();

    if (!(p1 && p2)) {
      return;
    }

    const color = World.s_jointColor;

    switch (joint.m_type) {
      case Joint.e_distanceJoint:
        {
          this.m_debugDraw.DrawSegment(p1, p2, color);
        }
        break;

      case Joint.e_pulleyJoint:
        {
          // const pulley = joint instanceof PulleyJoint ? joint : null;
          // const s1 = pulley.GetGroundAnchorA();
          // const s2 = pulley.GetGroundAnchorB();
          //
          // this.m_debugDraw.DrawSegment(s1, p1, color);
          // this.m_debugDraw.DrawSegment(s2, p2, color);
          // this.m_debugDraw.DrawSegment(s1, s2, color);
        }
        break;

      case Joint.e_mouseJoint:
        {
          this.m_debugDraw.DrawSegment(p1, p2, color);
        }
        break;

      default:
        if (b1 !== this.m_groundBody) {
          this.m_debugDraw.DrawSegment(x1, p1, color);
        }

        this.m_debugDraw.DrawSegment(p1, p2, color);

        if (b2 !== this.m_groundBody) {
          this.m_debugDraw.DrawSegment(x2, p2, color);
        }
    }
  }

  public DrawShape(shape: Shape, xf: Transform, color: Color) {
    if (!this.m_debugDraw) {
      return;
    }

    switch (shape.m_type) {
      case Shape.e_circleShape:
        {
          if (!(shape instanceof CircleShape)) {
            return;
          }

          const circle = shape as CircleShape;

          const center = MulX(xf, circle.m_p);
          const radius = circle.m_radius;
          const axis = xf.R.col1;

          this.m_debugDraw.DrawSolidCircle(center, radius, axis, color);
        }
        break;

      case Shape.e_polygonShape:
        {
          if (!(shape instanceof PolygonShape)) {
            return;
          }
          const poly = shape as PolygonShape;

          const vertexCount = parseInt(`${poly.GetVertexCount()}`, 10);
          const localVertices = poly.GetVertices();
          const vertices = new Array(vertexCount);

          for (let i = 0; i < vertexCount; ++i) {
            vertices[i] = MulX(xf, localVertices[i]);
          }

          this.m_debugDraw.DrawSolidPolygon(vertices, vertexCount, color);
        }
        break;
      case Shape.e_edgeShape:
        {
          if (!(shape instanceof EdgeShape)) {
            return;
          }
          const edge = shape as EdgeShape;

          this.m_debugDraw.DrawSegment(
            MulX(xf, edge.GetVertex1()),
            MulX(xf, edge.GetVertex2()),
            color,
          );
        }
        break;
    }
  }
}

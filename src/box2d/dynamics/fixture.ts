// tslint:disable variable-name

import FilterData from './filter-data';
import Aabb from '../collision/aabb';
import Shape from '../collision/shapes/shape';
import Body from '../dynamics/body';
import { SubtractVV } from '../common/math';
import Vec2 from '../common/math/vec2';
import RayCastOutput from '../collision/ray-cast-output';
import RayCastInput from '../collision/ray-cast-input';
import MassData from '../collision/shapes/mass-data';
import Transform from '../common/math/transform';
import FixtureDef from './fixture-def';
import DynamicTreeBroadPhase from '../collision/dynamic-tree-broad-phase';
import DynamicTreeNode from '../collision/dynamic-tree-node';

export default class Fixture {
  public m_filter = new FilterData();

  public m_aabb = new Aabb();
  public m_userData?: any;

  public m_body?: Body;
  public m_next?: Body;

  public m_shape?: Shape;
  public m_density = 0;
  public m_friction = 0;
  public m_restitution = 0;
  public m_isSensor = false;
  public m_proxy?: DynamicTreeNode;

  public GetType() {
    return this.m_shape ? this.m_shape.GetType() : Shape.e_unknownShape;
  }

  public GetShape() {
    return this.m_shape;
  }

  public SetSensor(sensor: boolean) {
    if (this.m_isSensor === sensor) {
      return;
    }

    this.m_isSensor = sensor;
    if (!this.m_body) {
      return;
    }

    let edge = this.m_body.GetContactList();
    while (edge) {
      const contact = edge.contact;
      const fixtureA = contact.GetFixtureA();
      const fixtureB = contact.GetFixtureB();

      if (fixtureA === this || fixtureB === this) {
        contact.SetSensor(fixtureA.IsSensor() || fixtureB.IsSensor());
      }

      edge = edge.next;
    }
  }

  public IsSensor() {
    return this.m_isSensor;
  }

  public SetFilterData(filter: FilterData) {
    this.m_filter = filter.Copy();

    if (!this.m_body) {
      return;
    }

    let edge = this.m_body.GetContactList();
    while (edge) {
      const contact = edge.contact;
      const fixtureA = contact.GetFixtureA();
      const fixtureB = contact.GetFixtureB();

      if (fixtureA === this || fixtureB === this) {
        contact.FlagForFiltering();
      }

      edge = edge.next;
    }
  }

  public GetFilterData() {
    return this.m_filter.Copy();
  }

  public GetBody() {
    return this.m_body;
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

  public TestPoint(p: Vec2) {
    if (!(this.m_shape && this.m_body)) {
      return false;
    }

    return this.m_shape.TestPoint(this.m_body.GetTransform(), p);
  }

  public RayCast(output: RayCastOutput, input: RayCastInput) {
    if (!(this.m_shape && this.m_body)) {
      return false;
    }

    return this.m_shape.RayCast(output, input, this.m_body.GetTransform());
  }

  public GetMassData(massData = new MassData()) {
    if (!(this.m_shape && this.m_body)) {
      return false;
    }

    this.m_shape.ComputeMass(massData, this.m_density);
    return massData;
  }

  public SetDensity(density = 0) {
    this.m_density = density;
  }

  public GetDensity() {
    return this.m_density;
  }

  public GetFriction() {
    return this.m_friction;
  }

  public SetFriction(friction = 0) {
    this.m_friction = friction;
  }

  public GetRestitution() {
    return this.m_restitution;
  }

  public SetRestitution(restitution = 0) {
    this.m_restitution = restitution;
  }

  public GetAABB() {
    return this.m_aabb;
  }

  public Create(body: Body, xf: Transform, def: FixtureDef) {
    this.m_userData = def.userData;
    this.m_friction = def.friction;
    this.m_restitution = def.restitution;

    this.m_body = body;
    this.m_next = undefined;

    this.m_filter = def.filter.Copy();
    this.m_isSensor = def.isSensor;
    this.m_shape = def.shape.Copy();
    this.m_density = def.density;
  }

  public Destroy() {
    this.m_shape = undefined;
  }

  public CreateProxy(broadPhase: DynamicTreeBroadPhase, xf: Transform) {
    if (!(this.m_shape && this.m_body)) {
      return false;
    }

    this.m_shape.ComputeAABB(this.m_aabb, xf);
    this.m_proxy = broadPhase.CreateProxy(this.m_aabb, this);
  }

  public DestroyProxy(broadPhase: DynamicTreeBroadPhase) {
    if (this.m_proxy == null) {
      return;
    }

    broadPhase.DestroyProxy(this.m_proxy);
    this.m_proxy = undefined;
  }

  public Synchronize(
    broadPhase: DynamicTreeBroadPhase,
    transform1: Transform,
    transform2: Transform,
  ) {
    if (!(this.m_proxy && this.m_shape)) {
      return;
    }

    const aabb1 = new Aabb();
    const aabb2 = new Aabb();

    this.m_shape.ComputeAABB(aabb1, transform1);
    this.m_shape.ComputeAABB(aabb2, transform2);

    this.m_aabb.Combine(aabb1, aabb2);
    const displacement = SubtractVV(transform2.position, transform1.position);
    broadPhase.MoveProxy(this.m_proxy, this.m_aabb, displacement);
  }
}

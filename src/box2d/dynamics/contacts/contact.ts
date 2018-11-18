// tslint:disable variable-name

import ContactEdge from './contact-edge';
import Manifold from '../../collision/manifold';
import ToiInput from '../../collision/toi-input';
import WorldManifold from '../../collision/world-manifold';
import Fixture from '../fixture';
import Body from '../body';
import ContactListener from '../contact-listener';
import Shape from '../../collision/shapes/shape';
import Sweep from '../../common/math/sweep';
import { b2_linearSlop } from '../../common/settings';
import { TimeOfImpact } from '../../collision/time-of-impact';

export default class Contact {
  public static e_sensorFlag = 0x0001;
  public static e_continuousFlag = 0x0002;
  public static e_islandFlag = 0x0004;
  public static e_toiFlag = 0x0008;
  public static e_touchingFlag = 0x0010;
  public static e_enabledFlag = 0x0020;
  public static e_filterFlag = 0x0040;
  public static s_input = new ToiInput();

  public m_nodeA = new ContactEdge();
  public m_nodeB = new ContactEdge();
  public m_manifold = new Manifold();
  public m_oldManifold = new Manifold();

  public m_fixtureA?: Fixture;
  public m_fixtureB?: Fixture;
  public m_flags = 0;

  public m_prev?: Contact;
  public m_next?: Contact;
  public m_toi = 1;

  public GetManifold() {
    return this.m_manifold;
  }

  public GetWorldManifold(worldManifold: WorldManifold) {
    if (!(this.m_fixtureA && this.m_fixtureB)) {
      return;
    }

    const bodyA = this.m_fixtureA.GetBody();
    const bodyB = this.m_fixtureB.GetBody();

    const shapeA = this.m_fixtureA.GetShape();
    const shapeB = this.m_fixtureB.GetShape();

    if (!(bodyA && bodyB && shapeA && shapeB)) {
      return;
    }

    worldManifold.Initialize(
      this.m_manifold,
      bodyA.GetTransform(),
      shapeA.m_radius,
      bodyB.GetTransform(),
      shapeB.m_radius,
    );
  }

  public IsTouching() {
    return (this.m_flags & Contact.e_touchingFlag) === Contact.e_touchingFlag;
  }

  public IsContinuous() {
    return (
      (this.m_flags & Contact.e_continuousFlag) === Contact.e_continuousFlag
    );
  }

  public SetSensor(sensor: boolean) {
    if (sensor) {
      this.m_flags |= Contact.e_sensorFlag;
    } else {
      this.m_flags &= ~Contact.e_sensorFlag;
    }
  }

  public IsSensor() {
    return (this.m_flags & Contact.e_sensorFlag) === Contact.e_sensorFlag;
  }

  public SetEnabled(flag: boolean) {
    if (flag) {
      this.m_flags |= Contact.e_enabledFlag;
    } else {
      this.m_flags &= ~Contact.e_enabledFlag;
    }
  }

  public IsEnabled() {
    return (this.m_flags & Contact.e_enabledFlag) === Contact.e_enabledFlag;
  }

  public GetNext() {
    return this.m_next;
  }

  public GetFixtureA() {
    return this.m_fixtureA;
  }

  public GetFixtureB() {
    return this.m_fixtureB;
  }

  public FlagForFiltering() {
    this.m_flags |= Contact.e_filterFlag;
  }

  public Reset(fixtureA?: Fixture, fixtureB?: Fixture) {
    this.m_flags = Contact.e_enabledFlag;

    if (!(fixtureA && fixtureB)) {
      this.m_fixtureA = undefined;
      this.m_fixtureB = undefined;
      return;
    }

    if (fixtureA.IsSensor() || fixtureB.IsSensor()) {
      this.m_flags |= Contact.e_sensorFlag;
    }

    const bodyA = fixtureA.GetBody();
    const bodyB = fixtureB.GetBody();

    if (!(bodyA && bodyB)) {
      return;
    }

    if (
      bodyA.GetType() !== Body.b2_dynamicBody ||
      bodyA.IsBullet() ||
      bodyB.GetType() !== Body.b2_dynamicBody ||
      bodyB.IsBullet()
    ) {
      this.m_flags |= Contact.e_continuousFlag;
    }

    this.m_fixtureA = fixtureA;
    this.m_fixtureB = fixtureB;

    this.m_manifold.m_pointCount = 0;

    this.m_prev = undefined;
    this.m_next = undefined;

    this.m_nodeA.contact = undefined;
    this.m_nodeA.prev = undefined;
    this.m_nodeA.next = undefined;
    this.m_nodeA.other = undefined;

    this.m_nodeB.contact = undefined;
    this.m_nodeB.prev = undefined;
    this.m_nodeB.next = undefined;
    this.m_nodeB.other = undefined;
  }

  public Update(listener: ContactListener) {
    const tManifold = this.m_oldManifold;
    this.m_oldManifold = this.m_manifold;
    this.m_manifold = tManifold;

    this.m_flags |= Contact.e_enabledFlag;

    let touching = false;
    const wasTouching =
      (this.m_flags & Contact.e_touchingFlag) === Contact.e_touchingFlag;

    if (!(this.m_fixtureA && this.m_fixtureB)) {
      return;
    }

    const bodyA = this.m_fixtureA.m_body;
    const bodyB = this.m_fixtureB.m_body;

    if (!(bodyA && bodyB)) {
      return;
    }

    const aabbOverlap = this.m_fixtureA.m_aabb.TestOverlap(
      this.m_fixtureB.m_aabb,
    );

    if (this.m_flags & Contact.e_sensorFlag) {
      if (aabbOverlap) {
        const shapeA = this.m_fixtureA.GetShape();
        const shapeB = this.m_fixtureB.GetShape();

        if (!(shapeA && shapeB)) {
          return;
        }

        const xfA = bodyA.GetTransform();
        const xfB = bodyB.GetTransform();

        touching = Shape.TestOverlap(shapeA, xfA, shapeB, xfB);
      }

      this.m_manifold.m_pointCount = 0;
    } else {
      if (
        bodyA.GetType() !== Body.b2_dynamicBody ||
        bodyA.IsBullet() ||
        bodyB.GetType() !== Body.b2_dynamicBody ||
        bodyB.IsBullet()
      ) {
        this.m_flags |= Contact.e_continuousFlag;
      } else {
        this.m_flags &= ~Contact.e_continuousFlag;
      }

      if (aabbOverlap) {
        this.Evaluate();
        touching = this.m_manifold.m_pointCount > 0;

        for (let i = 0; i < this.m_manifold.m_pointCount; ++i) {
          const mp2 = this.m_manifold.m_points[i];

          mp2.m_normalImpulse = 0.0;
          mp2.m_tangentImpulse = 0.0;

          const id2 = mp2.m_id;
          for (let j = 0; j < this.m_oldManifold.m_pointCount; ++j) {
            const mp1 = this.m_oldManifold.m_points[j];

            if (mp1.m_id.key === id2.key) {
              mp2.m_normalImpulse = mp1.m_normalImpulse;
              mp2.m_tangentImpulse = mp1.m_tangentImpulse;
              break;
            }
          }
        }
      } else {
        this.m_manifold.m_pointCount = 0;
      }

      if (touching !== wasTouching) {
        bodyA.SetAwake(true);
        bodyB.SetAwake(true);
      }
    }

    if (touching) {
      this.m_flags |= Contact.e_touchingFlag;
    } else {
      this.m_flags &= ~Contact.e_touchingFlag;
    }

    if (wasTouching === false && touching === true) {
      listener.BeginContact(this);
    }

    if (wasTouching === true && touching === false) {
      listener.EndContact(this);
    }

    if ((this.m_flags & Contact.e_sensorFlag) === 0) {
      listener.PreSolve(this, this.m_oldManifold);
    }
  }

  public Evaluate() {} // tslint:disable-line no-empty

  public ComputeTOI(sweepA: Sweep, sweepB: Sweep) {
    if (!(this.m_fixtureA && this.m_fixtureB)) {
      return 0;
    }

    const shapeA = this.m_fixtureA.GetShape();
    const shapeB = this.m_fixtureB.GetShape();

    if (!(shapeA && shapeB)) {
      return 0;
    }

    Contact.s_input.proxyA.Set(shapeA);
    Contact.s_input.proxyB.Set(shapeB);

    Contact.s_input.sweepA = sweepA;
    Contact.s_input.sweepB = sweepB;

    Contact.s_input.tolerance = b2_linearSlop;
    return TimeOfImpact(Contact.s_input);
  }
}

// tslint:disable variable-name

import Contact from './contact';
import Fixture from '../fixture';
import { CollideCircles } from '../../collision';
import CircleShape from '../../collision/shapes/circle-shape';

export default class CircleContact extends Contact {
  public static Create(allocator: any) {
    return new CircleContact();
  }

  // tslint:disable-next-line no-empty
  public static Destroy(contact: Contact, allocator: any) {}

  public m_fixtureA?: Fixture;
  public m_fixtureB?: Fixture;

  public Evaluate() {
    if (!(this.m_fixtureA && this.m_fixtureB)) {
      return;
    }

    const bodyA = this.m_fixtureA.GetBody();
    const bodyB = this.m_fixtureB.GetBody();

    const shapeA = this.m_fixtureA.GetShape();
    const shapeB = this.m_fixtureB.GetShape();

    if (
      !(
        bodyA &&
        bodyB &&
        shapeA instanceof CircleShape &&
        shapeB instanceof CircleShape
      )
    ) {
      return;
    }

    CollideCircles(this.m_manifold, shapeA, bodyA.m_xf, shapeB, bodyB.m_xf);
  }
}

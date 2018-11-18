import Contact from './contact';
import { CollidePolygonAndCircle } from '../../collision';
import PolygonShape from '../../collision/shapes/polygon-shape';
import CircleShape from '../../collision/shapes/circle-shape';

export default class PolyAndCircleContact extends Contact {
  public static Create(allocator: any) {
    return new PolyAndCircleContact();
  }

  // tslint:disable-next-line no-empty
  public static Destroy(contact: Contact, allocator: any) {}

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
        shapeA instanceof PolygonShape &&
        shapeB instanceof CircleShape
      )
    ) {
      return;
    }

    CollidePolygonAndCircle(
      this.m_manifold,
      shapeA,
      bodyA.m_xf,
      shapeB,
      bodyB.m_xf,
    );
  }
}

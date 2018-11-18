import Contact from './contact';
import PolygonShape from '../../collision/shapes/polygon-shape';
import { CollidePolygons } from '../../collision';

export default class PolygonContact extends Contact {
  public static Create(allocator: any) {
    return new PolygonContact();
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
        shapeB instanceof PolygonShape
      )
    ) {
      return;
    }

    CollidePolygons(this.m_manifold, shapeA, bodyA.m_xf, shapeB, bodyB.m_xf);
  }
}

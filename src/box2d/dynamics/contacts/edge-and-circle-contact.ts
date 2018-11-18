import Contact from './contact';
import EdgeShape from '../../collision/shapes/edge-shape';
import CircleShape from '../../collision/shapes/circle-shape';
import Manifold from '../../collision/manifold';
import Transform from '../../common/math/transform';

export default class EdgeAndCircleContact extends Contact {
  public static Create(allocator: any) {
    return new EdgeAndCircleContact();
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
        shapeA instanceof EdgeShape &&
        shapeB instanceof CircleShape
      )
    ) {
      return;
    }

    this.CollideEdgeAndCircle(
      this.m_manifold,
      shapeA,
      bodyA.m_xf,
      shapeB,
      bodyB.m_xf,
    );
  }

  public CollideEdgeAndCircle(
    manifold: Manifold,
    edge: EdgeShape,
    xf1: Transform,
    circle: CircleShape,
    xf2: Transform,
  ) {} // tslint:disable-line no-empty
}

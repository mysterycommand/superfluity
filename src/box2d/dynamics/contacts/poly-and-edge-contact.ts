import Contact from './contact';
import PolygonShape from '../../collision/shapes/polygon-shape';
import EdgeShape from '../../collision/shapes/edge-shape';
import Manifold from '../../collision/manifold';
import Transform from '../../common/math/transform';

export default class PolyAndEdgeContact extends Contact {
  public static Create(allocator: any) {
    return new PolyAndEdgeContact();
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
        shapeB instanceof EdgeShape
      )
    ) {
      return;
    }

    this.CollidePolyAndEdge(
      this.m_manifold,
      shapeA,
      bodyA.m_xf,
      shapeB,
      bodyB.m_xf,
    );
  }

  public CollidePolyAndEdge(
    manifold: Manifold,
    polygon: PolygonShape,
    xf1: Transform,
    edge: EdgeShape,
    xf2: Transform,
  ) {} // tslint:disable-line no-empty
}

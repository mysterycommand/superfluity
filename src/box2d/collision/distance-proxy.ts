// tslint:disable variable-name

import { b2Assert } from '../common/settings';
import Vec2 from '../common/math/vec2';
import Shape from './shapes/shape';
import CircleShape from './shapes/circle-shape';
import PolygonShape from './shapes/polygon-shape';

export default class DistanceProxy {
  public m_vertices: Vec2[] = [];
  public m_count = 0;
  public m_radius = 0;

  public Set(shape: Shape) {
    switch (shape.GetType()) {
      case Shape.e_circleShape:
        {
          const circle = shape as CircleShape;
          this.m_vertices = [circle.m_p];
          this.m_count = 1;
          this.m_radius = circle.m_radius;
        }
        break;

      case Shape.e_polygonShape:
        {
          const polygon = shape as PolygonShape;
          this.m_vertices = polygon.m_vertices;
          this.m_count = polygon.m_vertexCount;
          this.m_radius = polygon.m_radius;
        }
        break;

      default:
        b2Assert(false);
    }
  }

  public GetSupport(d: Vec2) {
    let bestIndex = 0;
    let bestValue = this.m_vertices[0].x * d.x + this.m_vertices[0].y * d.y;

    for (let i = 1; i < this.m_count; ++i) {
      const value = this.m_vertices[i].x * d.x + this.m_vertices[i].y * d.y;

      if (value > bestValue) {
        bestIndex = i;
        bestValue = value;
      }
    }

    return bestIndex;
  }

  public GetSupportVertex(d: Vec2) {
    let bestIndex = 0;
    let bestValue = this.m_vertices[0].x * d.x + this.m_vertices[0].y * d.y;

    for (let i = 1; i < this.m_count; ++i) {
      const value = this.m_vertices[i].x * d.x + this.m_vertices[i].y * d.y;

      if (value > bestValue) {
        bestIndex = i;
        bestValue = value;
      }
    }

    return this.m_vertices[bestIndex];
  }

  public GetVertexCount() {
    return this.m_count;
  }

  public GetVertex(index = 0) {
    b2Assert(0 <= index && index < this.m_count);
    return this.m_vertices[index];
  }
}

// tslint:disable variable-name

import { b2Assert } from '../../common/settings';
import {
  CrossVF,
  Dot,
  MulMV,
  MulTMV,
  MulX,
  SubtractVV,
} from '../../common/math';
import Mat22 from '../../common/math/mat22';
import Vec2 from '../../common/math/vec2';
import Transform from '../../common/math/transform';
import Aabb from '../aabb';
import MassData from './mass-data';
import Shape from './shape';
import RayCastOutput from '../ray-cast-output';
import RayCastInput from '../ray-cast-input';

export default class PolygonShape extends Shape {
  public static s_mat = new Mat22();

  public static ComputeCentroid(vs: Vec2[], count = 0) {
    const c = new Vec2();
    let area = 0.0;
    const p1X = 0.0;
    const p1Y = 0.0;
    const inv3 = 1.0 / 3.0;

    for (let i = 0; i < count; ++i) {
      const p2 = vs[i];
      const p3 = i + 1 < count ? vs[parseInt(`${i + 1}`, 10)] : vs[0];

      const e1X = p2.x - p1X;
      const e1Y = p2.y - p1Y;

      const e2X = p3.x - p1X;
      const e2Y = p3.y - p1Y;

      const D = e1X * e2Y - e1Y * e2X;
      const triangleArea = 0.5 * D;

      area += triangleArea;
      c.x += triangleArea * inv3 * (p1X + p2.x + p3.x);
      c.y += triangleArea * inv3 * (p1Y + p2.y + p3.y);
    }

    c.x *= 1.0 / area;
    c.y *= 1.0 / area;

    return c;
  }

  public static ComputeOBB(
    obb: {
      center: Vec2;
      extents: Vec2;
      R: {
        col1: Vec2;
        col2: Vec2;
      };
    },
    vs: Vec2[],
    count = 0,
  ) {
    const p = new Array(count + 1);

    for (let i = 0; i < count; ++i) {
      p[i] = vs[i];
    }

    p[count] = p[0];
    let minArea = Number.MAX_VALUE;

    for (let i = 1; i <= count; ++i) {
      const root = p[parseInt(`${i - 1}`, 10)];
      let uxX = p[i].x - root.x;
      let uxY = p[i].y - root.y;

      const length = Math.sqrt(uxX * uxX + uxY * uxY);
      uxX /= length;
      uxY /= length;

      const uyX = -uxY;
      const uyY = uxX;

      let lowerX = Number.MAX_VALUE;
      let lowerY = Number.MAX_VALUE;

      let upperX = -Number.MAX_VALUE;
      let upperY = -Number.MAX_VALUE;

      for (let j = 0; j < count; ++j) {
        const dX = p[j].x - root.x;
        const dY = p[j].y - root.y;

        const rX = uxX * dX + uxY * dY;
        const rY = uyX * dX + uyY * dY;

        if (rX < lowerX) {
          lowerX = rX;
        }

        if (rY < lowerY) {
          lowerY = rY;
        }

        if (rX > upperX) {
          upperX = rX;
        }

        if (rY > upperY) {
          upperY = rY;
        }
      }

      const area = (upperX - lowerX) * (upperY - lowerY);
      if (area < 0.95 * minArea) {
        minArea = area;

        obb.R.col1.x = uxX;
        obb.R.col1.y = uxY;
        obb.R.col2.x = uyX;
        obb.R.col2.y = uyY;

        const centerX = 0.5 * (lowerX + upperX);
        const centerY = 0.5 * (lowerY + upperY);
        const tMat = obb.R;

        obb.center.x = root.x + (tMat.col1.x * centerX + tMat.col2.x * centerY);
        obb.center.y = root.y + (tMat.col1.y * centerX + tMat.col2.y * centerY);
        obb.extents.x = 0.5 * (upperX - lowerX);
        obb.extents.y = 0.5 * (upperY - lowerY);
      }
    }
  }

  public static AsArray(vertices: Vec2[], vertexCount = 0) {
    const polygonShape = new PolygonShape();
    polygonShape.SetAsArray(vertices, vertexCount);
    return polygonShape;
  }

  public static AsVector(vertices: Vec2[], vertexCount = 0) {
    const polygonShape = new PolygonShape();
    polygonShape.SetAsVector(vertices, vertexCount);
    return polygonShape;
  }

  public static AsBox(hx = 0, hy = 0) {
    const polygonShape = new PolygonShape();
    polygonShape.SetAsBox(hx, hy);
    return polygonShape;
  }

  public static AsOrientedBox(hx = 0, hy = 0, center = new Vec2(), angle = 0) {
    const polygonShape = new PolygonShape();
    polygonShape.SetAsOrientedBox(hx, hy, center, angle);
    return polygonShape;
  }

  public static AsEdge(v1: Vec2, v2: Vec2) {
    const polygonShape = new PolygonShape();
    polygonShape.SetAsEdge(v1, v2);
    return polygonShape;
  }

  public m_centroid = new Vec2();
  public m_vertexCount = 0;
  public m_vertices: Vec2[] = [];
  public m_normals: Vec2[] = [];

  constructor() {
    super();
    this.m_type = Shape.e_polygonShape;
    this.m_centroid = new Vec2();
    this.m_vertices = [];
    this.m_normals = [];
  }

  public Copy() {
    const copy = new PolygonShape();
    copy.Set(this);
    return copy;
  }

  public Set(other: PolygonShape) {
    super.Set(other);

    if (other instanceof PolygonShape) {
      this.m_centroid.SetV(other.m_centroid);
      this.m_vertexCount = other.m_vertexCount;
      this.Reserve(this.m_vertexCount);

      for (let i = 0; i < this.m_vertexCount; i++) {
        this.m_vertices[i].SetV(other.m_vertices[i]);
        this.m_normals[i].SetV(other.m_normals[i]);
      }
    }
  }

  public SetAsArray(vertices: Vec2[], vertexCount = 0) {
    this.SetAsVector(vertices.slice(), vertexCount);
  }

  public SetAsVector(vertices: Vec2[], vertexCount = 0) {
    if (vertexCount === 0) {
      vertexCount = vertices.length;
    }

    b2Assert(2 <= vertexCount);

    this.m_vertexCount = vertexCount;
    this.Reserve(vertexCount);

    for (let i = 0; i < this.m_vertexCount; i++) {
      this.m_vertices[i].SetV(vertices[i]);
    }

    for (let i = 0; i < this.m_vertexCount; ++i) {
      const i1 = parseInt(`${i}`, 10);
      const i2 = parseInt(`${i + 1 < this.m_vertexCount ? i + 1 : 0}`, 10);

      const edge = SubtractVV(this.m_vertices[i2], this.m_vertices[i1]);

      b2Assert(edge.LengthSquared() > Number.MIN_VALUE);

      this.m_normals[i].SetV(CrossVF(edge, 1.0));
      this.m_normals[i].Normalize();
    }

    this.m_centroid = PolygonShape.ComputeCentroid(
      this.m_vertices,
      this.m_vertexCount,
    );
  }

  public SetAsBox(hx = 0, hy = 0) {
    this.m_vertexCount = 4;
    this.Reserve(4);

    this.m_vertices[0].Set(-hx, -hy);
    this.m_vertices[1].Set(hx, -hy);
    this.m_vertices[2].Set(hx, hy);
    this.m_vertices[3].Set(-hx, hy);

    this.m_normals[0].Set(0.0, -1.0);
    this.m_normals[1].Set(1.0, 0.0);
    this.m_normals[2].Set(0.0, 1.0);
    this.m_normals[3].Set(-1.0, 0.0);

    this.m_centroid.SetZero();
  }

  public SetAsOrientedBox(hx = 0, hy = 0, center = new Vec2(), angle = 0) {
    this.m_vertexCount = 4;
    this.Reserve(4);

    this.m_vertices[0].Set(-hx, -hy);
    this.m_vertices[1].Set(hx, -hy);
    this.m_vertices[2].Set(hx, hy);
    this.m_vertices[3].Set(-hx, hy);

    this.m_normals[0].Set(0.0, -1.0);
    this.m_normals[1].Set(1.0, 0.0);
    this.m_normals[2].Set(0.0, 1.0);
    this.m_normals[3].Set(-1.0, 0.0);

    this.m_centroid = center;
    const xf = new Transform();
    xf.position = center;
    xf.R.Set(angle);

    for (let i = 0; i < this.m_vertexCount; ++i) {
      this.m_vertices[i] = MulX(xf, this.m_vertices[i]);
      this.m_normals[i] = MulMV(xf.R, this.m_normals[i]);
    }
  }

  public SetAsEdge(v1: Vec2, v2: Vec2) {
    this.m_vertexCount = 2;
    this.Reserve(2);

    this.m_vertices[0].SetV(v1);
    this.m_vertices[1].SetV(v2);

    this.m_centroid.x = 0.5 * (v1.x + v2.x);
    this.m_centroid.y = 0.5 * (v1.y + v2.y);

    this.m_normals[0] = CrossVF(SubtractVV(v2, v1), 1.0);
    this.m_normals[0].Normalize();

    this.m_normals[1].x = -this.m_normals[0].x;
    this.m_normals[1].y = -this.m_normals[0].y;
  }

  public TestPoint(xf: Transform, p: Vec2) {
    let tVec;

    const tMat = xf.R;
    let tX = p.x - xf.position.x;
    let tY = p.y - xf.position.y;

    const pLocalX = tX * tMat.col1.x + tY * tMat.col1.y;
    const pLocalY = tX * tMat.col2.x + tY * tMat.col2.y;

    for (let i = 0; i < this.m_vertexCount; ++i) {
      tVec = this.m_vertices[i];

      tX = pLocalX - tVec.x;
      tY = pLocalY - tVec.y;

      tVec = this.m_normals[i];

      const dot = tVec.x * tX + tVec.y * tY;
      if (dot > 0.0) {
        return false;
      }
    }

    return true;
  }

  public RayCast(
    output: RayCastOutput,
    input: RayCastInput,
    transform: Transform,
  ) {
    let lower = 0;
    let upper = input.maxFraction;

    let tX = 0;
    let tY = 0;
    let tMat;
    let tVec;
    tX = input.p1.x - transform.position.x;
    tY = input.p1.y - transform.position.y;
    tMat = transform.R;

    const p1X = tX * tMat.col1.x + tY * tMat.col1.y;
    const p1Y = tX * tMat.col2.x + tY * tMat.col2.y;
    tX = input.p2.x - transform.position.x;
    tY = input.p2.y - transform.position.y;
    tMat = transform.R;

    const p2X = tX * tMat.col1.x + tY * tMat.col1.y;
    const p2Y = tX * tMat.col2.x + tY * tMat.col2.y;
    const dX = p2X - p1X;
    const dY = p2Y - p1Y;

    let index = parseInt('-1', 10);
    for (let i = 0; i < this.m_vertexCount; ++i) {
      tVec = this.m_vertices[i];
      tX = tVec.x - p1X;
      tY = tVec.y - p1Y;
      tVec = this.m_normals[i];

      const numerator = tVec.x * tX + tVec.y * tY;
      const denominator = tVec.x * dX + tVec.y * dY;
      if (denominator === 0) {
        if (numerator < 0) {
          return false;
        }
      } else {
        if (denominator < 0 && numerator < lower * denominator) {
          lower = numerator / denominator;
          index = i;
        } else if (denominator > 0 && numerator < upper * denominator) {
          upper = numerator / denominator;
        }
      }

      if (upper < lower - Number.MIN_VALUE) {
        return false;
      }
    }

    if (index >= 0) {
      output.fraction = lower;
      tMat = transform.R;
      tVec = this.m_normals[index];
      output.normal.x = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
      output.normal.y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
      return true;
    }

    return false;
  }

  public ComputeAABB(aabb: Aabb, xf: Transform) {
    const tMat = xf.R;
    let tVec = this.m_vertices[0];

    let lowerX = xf.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
    let lowerY = xf.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

    let upperX = lowerX;
    let upperY = lowerY;

    for (let i = 1; i < this.m_vertexCount; ++i) {
      tVec = this.m_vertices[i];

      const vX = xf.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
      const vY = xf.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

      lowerX = lowerX < vX ? lowerX : vX;
      lowerY = lowerY < vY ? lowerY : vY;

      upperX = upperX > vX ? upperX : vX;
      upperY = upperY > vY ? upperY : vY;
    }

    aabb.lowerBound.x = lowerX - this.m_radius;
    aabb.lowerBound.y = lowerY - this.m_radius;
    aabb.upperBound.x = upperX + this.m_radius;
    aabb.upperBound.y = upperY + this.m_radius;
  }

  public ComputeMass(
    massData: { mass: number; center: Vec2; I: number },
    density = 0,
  ) {
    if (this.m_vertexCount === 2) {
      massData.center.x = 0.5 * (this.m_vertices[0].x + this.m_vertices[1].x);
      massData.center.y = 0.5 * (this.m_vertices[0].y + this.m_vertices[1].y);
      massData.mass = 0.0;
      massData.I = 0.0;
      return;
    }

    let centerX = 0.0;
    let centerY = 0.0;
    let area = 0.0;
    let I = 0.0;

    const p1X = 0.0;
    const p1Y = 0.0;
    const k_inv3 = 1.0 / 3.0;
    for (let i = 0; i < this.m_vertexCount; ++i) {
      const p2 = this.m_vertices[i];
      const p3 =
        i + 1 < this.m_vertexCount
          ? this.m_vertices[parseInt(`${i + 1}`, 10)]
          : this.m_vertices[0];

      const e1X = p2.x - p1X;
      const e1Y = p2.y - p1Y;

      const e2X = p3.x - p1X;
      const e2Y = p3.y - p1Y;

      const D = e1X * e2Y - e1Y * e2X;
      const triangleArea = 0.5 * D;

      area += triangleArea;
      centerX += triangleArea * k_inv3 * (p1X + p2.x + p3.x);
      centerY += triangleArea * k_inv3 * (p1Y + p2.y + p3.y);

      const px = p1X;
      const py = p1Y;

      const ex1 = e1X;
      const ey1 = e1Y;

      const ex2 = e2X;
      const ey2 = e2Y;

      const intx2 =
        k_inv3 *
          (0.25 * (ex1 * ex1 + ex2 * ex1 + ex2 * ex2) + (px * ex1 + px * ex2)) +
        0.5 * px * px;

      const inty2 =
        k_inv3 *
          (0.25 * (ey1 * ey1 + ey2 * ey1 + ey2 * ey2) + (py * ey1 + py * ey2)) +
        0.5 * py * py;

      I += D * (intx2 + inty2);
    }

    massData.mass = density * area;
    centerX *= 1 / area;
    centerY *= 1 / area;
    massData.center.Set(centerX, centerY);
    massData.I = density * I;
  }

  public ComputeSubmergedArea(
    normal: Vec2,
    offset = 0,
    xf: Transform,
    c: Vec2,
  ) {
    const normalL = MulTMV(xf.R, normal);
    const offsetL = offset - Dot(normal, xf.position);

    const depths = [];
    let diveCount = 0;

    let intoIndex = parseInt(`${-1}`, 10);
    let outoIndex = parseInt(`${-1}`, 10);

    let lastSubmerged = false;
    for (let i = 0; i < this.m_vertexCount; ++i) {
      depths[i] = Dot(normalL, this.m_vertices[i]) - offsetL;
      const isSubmerged = depths[i] < -Number.MIN_VALUE;

      if (i > 0) {
        if (isSubmerged) {
          if (!lastSubmerged) {
            intoIndex = i - 1;
            diveCount++;
          }
        } else {
          if (lastSubmerged) {
            outoIndex = i - 1;
            diveCount++;
          }
        }
      }

      lastSubmerged = isSubmerged;
    }

    switch (diveCount) {
      case 0: {
        if (lastSubmerged) {
          const md = new MassData();
          this.ComputeMass(md, 1);
          c.SetV(MulX(xf, md.center));
          return md.mass;
        }

        return 0;
      }

      case 1:
        if (intoIndex === -1) {
          intoIndex = this.m_vertexCount - 1;
        } else {
          outoIndex = this.m_vertexCount - 1;
        }
        break;
    }

    const intoIndex2 = parseInt(`${(intoIndex + 1) % this.m_vertexCount}`, 10);
    const outoIndex2 = parseInt(`${(outoIndex + 1) % this.m_vertexCount}`, 10);

    const intoLamdda =
      (0 - depths[intoIndex]) / (depths[intoIndex2] - depths[intoIndex]);

    const outoLamdda =
      (0 - depths[outoIndex]) / (depths[outoIndex2] - depths[outoIndex]);

    const intoVec = new Vec2(
      this.m_vertices[intoIndex].x * (1 - intoLamdda) +
        this.m_vertices[intoIndex2].x * intoLamdda,
      this.m_vertices[intoIndex].y * (1 - intoLamdda) +
        this.m_vertices[intoIndex2].y * intoLamdda,
    );

    const outoVec = new Vec2(
      this.m_vertices[outoIndex].x * (1 - outoLamdda) +
        this.m_vertices[outoIndex2].x * outoLamdda,
      this.m_vertices[outoIndex].y * (1 - outoLamdda) +
        this.m_vertices[outoIndex2].y * outoLamdda,
    );

    let area = 0;
    const center = new Vec2();
    let p2 = this.m_vertices[intoIndex2];

    let p3;
    let j = intoIndex2;
    while (j !== outoIndex2) {
      j = (j + 1) % this.m_vertexCount;

      if (j === outoIndex2) {
        p3 = outoVec;
      } else {
        p3 = this.m_vertices[j];
      }

      const triangleArea =
        0.5 *
        ((p2.x - intoVec.x) * (p3.y - intoVec.y) -
          (p2.y - intoVec.y) * (p3.x - intoVec.x));

      area += triangleArea;
      center.x += (triangleArea * (intoVec.x + p2.x + p3.x)) / 3;
      center.y += (triangleArea * (intoVec.y + p2.y + p3.y)) / 3;
      p2 = p3;
    }

    center.Multiply(1 / area);
    c.SetV(MulX(xf, center));
    return area;
  }

  public GetVertexCount() {
    return this.m_vertexCount;
  }

  public GetVertices() {
    return this.m_vertices;
  }

  public GetNormals() {
    return this.m_normals;
  }

  public GetSupport(d: Vec2) {
    let bestIndex = 0;
    let bestValue = this.m_vertices[0].x * d.x + this.m_vertices[0].y * d.y;

    for (let i = 1; i < this.m_vertexCount; ++i) {
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

    for (let i = 1; i < this.m_vertexCount; ++i) {
      const value = this.m_vertices[i].x * d.x + this.m_vertices[i].y * d.y;

      if (value > bestValue) {
        bestIndex = i;
        bestValue = value;
      }
    }

    return this.m_vertices[bestIndex];
  }

  public Validate() {
    return false;
  }

  public Reserve(count = 0) {
    for (let i = parseInt(`${this.m_vertices.length}`, 10); i < count; i++) {
      this.m_vertices[i] = new Vec2();
      this.m_normals[i] = new Vec2();
    }
  }
}

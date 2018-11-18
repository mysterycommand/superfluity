// tslint:disable variable-name

import * as Settings from '../common/settings';
import Vec2 from '../common/math/vec2';
import ClipVertex from './clip-vertex';
import Transform from '../common/math/transform';
import Manifold from './manifold';
import Aabb from './aabb';

export const s_incidentEdge = MakeClipPointVector();
export const s_clipPoints1 = MakeClipPointVector();
export const s_clipPoints2 = MakeClipPointVector();

export const s_edgeAO = new Array(1).fill(0);
export const s_edgeBO = new Array(1).fill(0);

export const s_localTangent = new Vec2();
export const s_localNormal = new Vec2();
export const s_planePoint = new Vec2();
export const s_normal = new Vec2();
export const s_tangent = new Vec2();
export const s_tangent2 = new Vec2();
export const s_v11 = new Vec2();
export const s_v12 = new Vec2();

export const b2CollidePolyTempVec = new Vec2();
export const b2_nullFeature = 0x000000ff;

export function ClipSegmentToLine(
  vOut: [ClipVertex, ClipVertex],
  vIn: [ClipVertex, ClipVertex],
  normal: Vec2,
  offset = 0,
) {
  let cv;
  let numOut = 0;
  cv = vIn[0];

  const vIn0 = cv.v;
  cv = vIn[1];

  const vIn1 = cv.v;
  const distance0 = normal.x * vIn0.x + normal.y * vIn0.y - offset;
  const distance1 = normal.x * vIn1.x + normal.y * vIn1.y - offset;

  if (distance0 <= 0.0) {
    vOut[numOut++].Set(vIn[0]);
  }

  if (distance1 <= 0.0) {
    vOut[numOut++].Set(vIn[1]);
  }

  if (distance0 * distance1 < 0.0) {
    const interp = distance0 / (distance0 - distance1);
    cv = vOut[numOut];

    const tVec = cv.v;
    tVec.x = vIn0.x + interp * (vIn1.x - vIn0.x);
    tVec.y = vIn0.y + interp * (vIn1.y - vIn0.y);

    cv = vOut[numOut];
    let cv2;

    if (distance0 > 0.0) {
      cv2 = vIn[0];
      cv.id = cv2.id;
    } else {
      cv2 = vIn[1];
      cv.id = cv2.id;
    }

    ++numOut;
  }

  return numOut;
}

interface Poly {
  m_vertexCount: number;
  m_vertices: Vec2[];
  m_normals: Vec2[];
  m_centroid: Vec2;
  m_radius: number;
}

interface Circ {
  m_p: Vec2;
  m_radius: number;
}

export function EdgeSeparation(
  poly1: Poly,
  xf1: Transform,
  edge1 = 0,
  poly2: Poly,
  xf2: Transform,
) {
  // const count1 = parseInt(`${poly1.m_vertexCount}`, 10);
  const vertices1 = poly1.m_vertices;
  const normals1 = poly1.m_normals;

  const count2 = parseInt(`${poly2.m_vertexCount}`, 10);
  const vertices2 = poly2.m_vertices;

  let tMat;
  let tVec;
  tMat = xf1.R;
  tVec = normals1[edge1];

  const normal1WorldX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
  const normal1WorldY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
  tMat = xf2.R;

  const normal1X = tMat.col1.x * normal1WorldX + tMat.col1.y * normal1WorldY;
  const normal1Y = tMat.col2.x * normal1WorldX + tMat.col2.y * normal1WorldY;

  let index = 0;
  let minDot = Number.MAX_VALUE;
  for (let i = 0; i < count2; ++i) {
    tVec = vertices2[i];
    const dot = tVec.x * normal1X + tVec.y * normal1Y;

    if (dot < minDot) {
      minDot = dot;
      index = i;
    }
  }

  tVec = vertices1[edge1];
  tMat = xf1.R;

  const v1X = xf1.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
  const v1Y = xf1.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
  tVec = vertices2[index];
  tMat = xf2.R;

  let v2X = xf2.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
  let v2Y = xf2.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
  v2X -= v1X;
  v2Y -= v1Y;

  const separation = v2X * normal1WorldX + v2Y * normal1WorldY;
  return separation;
}

export function FindMaxSeparation(
  edgeIndex: number[] = [],
  poly1: Poly,
  xf1: Transform,
  poly2: Poly,
  xf2: Transform,
) {
  const count1 = parseInt(`${poly1.m_vertexCount}`, 10);
  const normals1 = poly1.m_normals;

  let tVec;
  let tMat;
  tMat = xf2.R;
  tVec = poly2.m_centroid;

  let dX = xf2.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
  let dY = xf2.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
  tMat = xf1.R;
  tVec = poly1.m_centroid;

  dX -= xf1.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
  dY -= xf1.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

  const dLocal1X = dX * xf1.R.col1.x + dY * xf1.R.col1.y;
  const dLocal1Y = dX * xf1.R.col2.x + dY * xf1.R.col2.y;

  let edge = 0;
  let maxDot = -Number.MAX_VALUE;
  for (let i = 0; i < count1; ++i) {
    tVec = normals1[i];
    const dot = tVec.x * dLocal1X + tVec.y * dLocal1Y;

    if (dot > maxDot) {
      maxDot = dot;
      edge = i;
    }
  }

  let s = EdgeSeparation(poly1, xf1, edge, poly2, xf2);
  const prevEdge = parseInt(`${edge - 1 >= 0 ? edge - 1 : count1 - 1}`, 10);
  const sPrev = EdgeSeparation(poly1, xf1, prevEdge, poly2, xf2);

  const nextEdge = parseInt(`${edge + 1 < count1 ? edge + 1 : 0}`, 10);
  const sNext = EdgeSeparation(poly1, xf1, nextEdge, poly2, xf2);

  let increment = 0;
  let bestEdge = 0;
  let bestSeparation = 0;
  if (sPrev > s && sPrev > sNext) {
    increment = -1;
    bestEdge = prevEdge;
    bestSeparation = sPrev;
  } else if (sNext > s) {
    increment = 1;
    bestEdge = nextEdge;
    bestSeparation = sNext;
  } else {
    edgeIndex[0] = edge;
    return s;
  }

  while (true) {
    if (increment === -1) {
      edge = bestEdge - 1 >= 0 ? bestEdge - 1 : count1 - 1;
    } else {
      edge = bestEdge + 1 < count1 ? bestEdge + 1 : 0;
    }

    s = EdgeSeparation(poly1, xf1, edge, poly2, xf2);
    if (s > bestSeparation) {
      bestEdge = edge;
      bestSeparation = s;
    } else {
      break;
    }
  }

  edgeIndex[0] = bestEdge;
  return bestSeparation;
}

export function FindIncidentEdge(
  c: ClipVertex[],
  poly1: Poly,
  xf1: Transform,
  edge1 = 0,
  poly2: Poly,
  xf2: Transform,
) {
  // const count1 = parseInt(`${poly1.m_vertexCount}`, 10);
  const normals1 = poly1.m_normals;

  const count2 = parseInt(`${poly2.m_vertexCount}`, 10);
  const vertices2 = poly2.m_vertices;

  const normals2 = poly2.m_normals;
  let tMat;
  let tVec;

  tMat = xf1.R;
  tVec = normals1[edge1];

  let normal1X = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
  let normal1Y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

  tMat = xf2.R;
  const tX = tMat.col1.x * normal1X + tMat.col1.y * normal1Y;
  normal1Y = tMat.col2.x * normal1X + tMat.col2.y * normal1Y;
  normal1X = tX;

  let index = 0;
  let minDot = Number.MAX_VALUE;
  for (let i = 0; i < count2; ++i) {
    tVec = normals2[i];
    const dot = normal1X * tVec.x + normal1Y * tVec.y;
    if (dot < minDot) {
      minDot = dot;
      index = i;
    }
  }

  let tClip;
  const i1 = parseInt(`${index}`, 10);
  const i2 = parseInt(`${i1 + 1 < count2 ? i1 + 1 : 0}`, 10);

  tClip = c[0];
  tVec = vertices2[i1];
  tMat = xf2.R;

  tClip.v.x = xf2.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
  tClip.v.y = xf2.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
  tClip.id.features.referenceEdge = edge1;
  tClip.id.features.incidentEdge = i1;
  tClip.id.features.incidentVertex = 0;

  tClip = c[1];
  tVec = vertices2[i2];
  tMat = xf2.R;

  tClip.v.x = xf2.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
  tClip.v.y = xf2.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
  tClip.id.features.referenceEdge = edge1;
  tClip.id.features.incidentEdge = i2;
  tClip.id.features.incidentVertex = 1;
}

export function MakeClipPointVector(): [ClipVertex, ClipVertex] {
  return [new ClipVertex(), new ClipVertex()];
}

export function CollidePolygons(
  manifold: Manifold,
  polyA: Poly,
  xfA: Transform,
  polyB: Poly,
  xfB: Transform,
) {
  let cv;
  manifold.m_pointCount = 0;
  const totalRadius = polyA.m_radius + polyB.m_radius;

  let edgeA = 0;
  s_edgeAO[0] = edgeA;
  const separationA = FindMaxSeparation(s_edgeAO, polyA, xfA, polyB, xfB);
  edgeA = s_edgeAO[0];

  if (separationA > totalRadius) {
    return;
  }

  let edgeB = 0;
  s_edgeBO[0] = edgeB;
  const separationB = FindMaxSeparation(s_edgeBO, polyB, xfB, polyA, xfA);
  edgeB = s_edgeBO[0];

  if (separationB > totalRadius) {
    return;
  }

  let poly1;
  let poly2;
  let xf1;
  let xf2;
  let edge1 = 0;
  let flip = 0;
  const k_relativeTol = 0.98;
  const k_absoluteTol = 0.001;
  let tMat;

  if (separationB > k_relativeTol * separationA + k_absoluteTol) {
    poly1 = polyB;
    poly2 = polyA;
    xf1 = xfB;
    xf2 = xfA;
    edge1 = edgeB;
    manifold.m_type = Manifold.e_faceB;
    flip = 1;
  } else {
    poly1 = polyA;
    poly2 = polyB;
    xf1 = xfA;
    xf2 = xfB;
    edge1 = edgeA;
    manifold.m_type = Manifold.e_faceA;
    flip = 0;
  }

  const incidentEdge = s_incidentEdge;
  FindIncidentEdge(incidentEdge, poly1, xf1, edge1, poly2, xf2);

  const count1 = parseInt(`${poly1.m_vertexCount}`, 10);
  const vertices1 = poly1.m_vertices;
  const local_v11 = vertices1[edge1];
  let local_v12;

  if (edge1 + 1 < count1) {
    local_v12 = vertices1[parseInt(`${edge1 + 1}`, 10)];
  } else {
    local_v12 = vertices1[0];
  }

  const localTangent = s_localTangent;
  localTangent.Set(local_v12.x - local_v11.x, local_v12.y - local_v11.y);
  localTangent.Normalize();

  const localNormal = s_localNormal;
  localNormal.x = localTangent.y;
  localNormal.y = -localTangent.x;

  const planePoint = s_planePoint;
  planePoint.Set(
    0.5 * (local_v11.x + local_v12.x),
    0.5 * (local_v11.y + local_v12.y),
  );

  const tangent = s_tangent;
  tMat = xf1.R;
  tangent.x = tMat.col1.x * localTangent.x + tMat.col2.x * localTangent.y;
  tangent.y = tMat.col1.y * localTangent.x + tMat.col2.y * localTangent.y;

  const tangent2 = s_tangent2;
  tangent2.x = -tangent.x;
  tangent2.y = -tangent.y;

  const normal = s_normal;
  normal.x = tangent.y;
  normal.y = -tangent.x;

  const v11 = s_v11;
  const v12 = s_v12;

  v11.x =
    xf1.position.x + (tMat.col1.x * local_v11.x + tMat.col2.x * local_v11.y);
  v11.y =
    xf1.position.y + (tMat.col1.y * local_v11.x + tMat.col2.y * local_v11.y);

  v12.x =
    xf1.position.x + (tMat.col1.x * local_v12.x + tMat.col2.x * local_v12.y);
  v12.y =
    xf1.position.y + (tMat.col1.y * local_v12.x + tMat.col2.y * local_v12.y);

  const frontOffset = normal.x * v11.x + normal.y * v11.y;

  const sideOffset1 = -tangent.x * v11.x - tangent.y * v11.y + totalRadius;
  const sideOffset2 = tangent.x * v12.x + tangent.y * v12.y + totalRadius;

  const clipPoints1 = s_clipPoints1;
  const clipPoints2 = s_clipPoints2;

  let np = 0;
  np = ClipSegmentToLine(clipPoints1, incidentEdge, tangent2, sideOffset1);
  if (np < 2) {
    return;
  }

  np = ClipSegmentToLine(clipPoints2, clipPoints1, tangent, sideOffset2);
  if (np < 2) {
    return;
  }

  manifold.m_localPlaneNormal.SetV(localNormal);
  manifold.m_localPoint.SetV(planePoint);

  let pointCount = 0;
  for (let i = 0; i < Settings.b2_maxManifoldPoints; ++i) {
    cv = clipPoints2[i];
    const separation = normal.x * cv.v.x + normal.y * cv.v.y - frontOffset;

    if (separation <= totalRadius) {
      const cp = manifold.m_points[pointCount];
      tMat = xf2.R;

      const tX = cv.v.x - xf2.position.x;
      const tY = cv.v.y - xf2.position.y;

      cp.m_localPoint.x = tX * tMat.col1.x + tY * tMat.col1.y;
      cp.m_localPoint.y = tX * tMat.col2.x + tY * tMat.col2.y;
      cp.m_id.Set(cv.id);
      cp.m_id.features.flip = flip;

      ++pointCount;
    }
  }

  manifold.m_pointCount = pointCount;
}

export function CollideCircles(
  manifold: Manifold,
  circle1: Circ,
  xf1: Transform,
  circle2: Circ,
  xf2: Transform,
) {
  manifold.m_pointCount = 0;

  let tMat;
  let tVec;
  tMat = xf1.R;
  tVec = circle1.m_p;

  const p1X = xf1.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
  const p1Y = xf1.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

  tMat = xf2.R;
  tVec = circle2.m_p;
  const p2X = xf2.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
  const p2Y = xf2.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

  const dX = p2X - p1X;
  const dY = p2Y - p1Y;

  const distSqr = dX * dX + dY * dY;
  const radius = circle1.m_radius + circle2.m_radius;

  if (distSqr > radius * radius) {
    return;
  }

  manifold.m_type = Manifold.e_circles;
  manifold.m_localPoint.SetV(circle1.m_p);
  manifold.m_localPlaneNormal.SetZero();
  manifold.m_pointCount = 1;
  manifold.m_points[0].m_localPoint.SetV(circle2.m_p);
  manifold.m_points[0].m_id.key = 0;
}

export function CollidePolygonAndCircle(
  manifold: Manifold,
  polygon: Poly,
  xf1: Transform,
  circle: Circ,
  xf2: Transform,
) {
  manifold.m_pointCount = 0;
  // const tPoint;

  let dX = 0;
  let dY = 0;

  // const positionX = 0;
  // const positionY = 0;

  let tVec;
  let tMat;
  tMat = xf2.R;
  tVec = circle.m_p;

  const cX = xf2.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
  const cY = xf2.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

  dX = cX - xf1.position.x;
  dY = cY - xf1.position.y;
  tMat = xf1.R;

  const cLocalX = dX * tMat.col1.x + dY * tMat.col1.y;
  const cLocalY = dX * tMat.col2.x + dY * tMat.col2.y;
  // const dist = 0;

  let normalIndex = 0;
  let separation = -Number.MAX_VALUE;
  const radius = polygon.m_radius + circle.m_radius;
  const vertexCount = parseInt(`${polygon.m_vertexCount}`, 10);
  const vertices = polygon.m_vertices;
  const normals = polygon.m_normals;

  for (let i = 0; i < vertexCount; ++i) {
    tVec = vertices[i];
    dX = cLocalX - tVec.x;
    dY = cLocalY - tVec.y;
    tVec = normals[i];

    const s = tVec.x * dX + tVec.y * dY;

    if (s > radius) {
      return;
    }

    if (s > separation) {
      separation = s;
      normalIndex = i;
    }
  }

  const vertIndex1 = parseInt(`${normalIndex}`, 10);
  const vertIndex2 = parseInt(
    `${vertIndex1 + 1 < vertexCount ? vertIndex1 + 1 : 0}`,
    10,
  );

  const v1 = vertices[vertIndex1];
  const v2 = vertices[vertIndex2];

  if (separation < Number.MIN_VALUE) {
    manifold.m_pointCount = 1;
    manifold.m_type = Manifold.e_faceA;
    manifold.m_localPlaneNormal.SetV(normals[normalIndex]);
    manifold.m_localPoint.x = 0.5 * (v1.x + v2.x);
    manifold.m_localPoint.y = 0.5 * (v1.y + v2.y);
    manifold.m_points[0].m_localPoint.SetV(circle.m_p);
    manifold.m_points[0].m_id.key = 0;
    return;
  }

  const u1 =
    (cLocalX - v1.x) * (v2.x - v1.x) + (cLocalY - v1.y) * (v2.y - v1.y);
  const u2 =
    (cLocalX - v2.x) * (v1.x - v2.x) + (cLocalY - v2.y) * (v1.y - v2.y);

  if (u1 <= 0.0) {
    if (
      (cLocalX - v1.x) * (cLocalX - v1.x) +
        (cLocalY - v1.y) * (cLocalY - v1.y) >
      radius * radius
    ) {
      return;
    }

    manifold.m_pointCount = 1;
    manifold.m_type = Manifold.e_faceA;
    manifold.m_localPlaneNormal.x = cLocalX - v1.x;
    manifold.m_localPlaneNormal.y = cLocalY - v1.y;
    manifold.m_localPlaneNormal.Normalize();
    manifold.m_localPoint.SetV(v1);
    manifold.m_points[0].m_localPoint.SetV(circle.m_p);
    manifold.m_points[0].m_id.key = 0;
  } else if (u2 <= 0) {
    if (
      (cLocalX - v2.x) * (cLocalX - v2.x) +
        (cLocalY - v2.y) * (cLocalY - v2.y) >
      radius * radius
    ) {
      return;
    }

    manifold.m_pointCount = 1;
    manifold.m_type = Manifold.e_faceA;
    manifold.m_localPlaneNormal.x = cLocalX - v2.x;
    manifold.m_localPlaneNormal.y = cLocalY - v2.y;
    manifold.m_localPlaneNormal.Normalize();
    manifold.m_localPoint.SetV(v2);
    manifold.m_points[0].m_localPoint.SetV(circle.m_p);
    manifold.m_points[0].m_id.key = 0;
  } else {
    const faceCenterX = 0.5 * (v1.x + v2.x);
    const faceCenterY = 0.5 * (v1.y + v2.y);
    separation =
      (cLocalX - faceCenterX) * normals[vertIndex1].x +
      (cLocalY - faceCenterY) * normals[vertIndex1].y;

    if (separation > radius) {
      return;
    }

    manifold.m_pointCount = 1;
    manifold.m_type = Manifold.e_faceA;
    manifold.m_localPlaneNormal.x = normals[vertIndex1].x;
    manifold.m_localPlaneNormal.y = normals[vertIndex1].y;
    manifold.m_localPlaneNormal.Normalize();
    manifold.m_localPoint.Set(faceCenterX, faceCenterY);
    manifold.m_points[0].m_localPoint.SetV(circle.m_p);
    manifold.m_points[0].m_id.key = 0;
  }
}

export function TestOverlap(a: Aabb, b: Aabb) {
  return a.TestOverlap(b);
}

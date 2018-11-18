// tslint:disable variable-name

import { b2_maxManifoldPoints } from '../common/settings';
import Vec2 from '../common/math/vec2';
import Transform from '../common/math/transform';
import Manifold from './manifold';

export default class WorldManifold {
  public m_normal = new Vec2();
  public m_points = new Array(b2_maxManifoldPoints);

  constructor() {
    this.m_points = this.m_points.fill(0).map(() => new Vec2());
  }

  public Initialize(
    manifold: Manifold,
    xfA: Transform,
    radiusA = 0,
    xfB: Transform,
    radiusB = 0,
  ) {
    if (manifold.m_pointCount === 0) {
      return;
    }

    let tVec;
    let tMat;

    let normalX = 0;
    let normalY = 0;

    let planePointX = 0;
    let planePointY = 0;

    let clipPointX = 0;
    let clipPointY = 0;

    switch (manifold.m_type) {
      case Manifold.e_circles:
        {
          tMat = xfA.R;
          tVec = manifold.m_localPoint;

          const pointAX =
            xfA.position.x + tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
          const pointAY =
            xfA.position.y + tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

          tMat = xfB.R;
          tVec = manifold.m_points[0].m_localPoint;

          const pointBX =
            xfB.position.x + tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
          const pointBY =
            xfB.position.y + tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

          const dX = pointBX - pointAX;
          const dY = pointBY - pointAY;
          const d2 = dX * dX + dY * dY;

          if (d2 > Number.MIN_VALUE * Number.MIN_VALUE) {
            const d = Math.sqrt(d2);
            this.m_normal.x = dX / d;
            this.m_normal.y = dY / d;
          } else {
            this.m_normal.x = 1;
            this.m_normal.y = 0;
          }

          const cAX = pointAX + radiusA * this.m_normal.x;
          const cAY = pointAY + radiusA * this.m_normal.y;

          const cBX = pointBX - radiusB * this.m_normal.x;
          const cBY = pointBY - radiusB * this.m_normal.y;

          this.m_points[0].x = 0.5 * (cAX + cBX);
          this.m_points[0].y = 0.5 * (cAY + cBY);
        }
        break;

      case Manifold.e_faceA:
        {
          tMat = xfA.R;
          tVec = manifold.m_localPlaneNormal;

          normalX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
          normalY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

          tMat = xfA.R;
          tVec = manifold.m_localPoint;

          planePointX =
            xfA.position.x + tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
          planePointY =
            xfA.position.y + tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

          this.m_normal.x = normalX;
          this.m_normal.y = normalY;

          for (let i = 0; i < manifold.m_pointCount; i++) {
            tMat = xfB.R;
            tVec = manifold.m_points[i].m_localPoint;

            clipPointX =
              xfB.position.x + tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
            clipPointY =
              xfB.position.y + tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

            this.m_points[i].x =
              clipPointX +
              0.5 *
                (radiusA -
                  (clipPointX - planePointX) * normalX -
                  (clipPointY - planePointY) * normalY -
                  radiusB) *
                normalX;

            this.m_points[i].y =
              clipPointY +
              0.5 *
                (radiusA -
                  (clipPointX - planePointX) * normalX -
                  (clipPointY - planePointY) * normalY -
                  radiusB) *
                normalY;
          }
        }
        break;

      case Manifold.e_faceB:
        {
          tMat = xfB.R;
          tVec = manifold.m_localPlaneNormal;

          normalX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
          normalY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

          tMat = xfB.R;
          tVec = manifold.m_localPoint;

          planePointX =
            xfB.position.x + tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
          planePointY =
            xfB.position.y + tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

          this.m_normal.x = -normalX;
          this.m_normal.y = -normalY;

          for (let i = 0; i < manifold.m_pointCount; i++) {
            tMat = xfA.R;
            tVec = manifold.m_points[i].m_localPoint;

            clipPointX =
              xfA.position.x + tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
            clipPointY =
              xfA.position.y + tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

            this.m_points[i].x =
              clipPointX +
              0.5 *
                (radiusB -
                  (clipPointX - planePointX) * normalX -
                  (clipPointY - planePointY) * normalY -
                  radiusA) *
                normalX;

            this.m_points[i].y =
              clipPointY +
              0.5 *
                (radiusB -
                  (clipPointX - planePointX) * normalX -
                  (clipPointY - planePointY) * normalY -
                  radiusA) *
                normalY;
          }
        }
        break;
    }
  }
}

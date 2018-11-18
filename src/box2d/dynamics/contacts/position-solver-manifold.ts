// tslint:disable variable-name

import Vec2 from '../../common/math/vec2';
import { b2_maxManifoldPoints, b2Assert } from '../../common/settings';
import Manifold from '../../collision/manifold';

export default class PositionSolverManifold {
  public static circlePointA = new Vec2();
  public static circlePointB = new Vec2();

  public m_normal = new Vec2();
  public m_separations = new Array(b2_maxManifoldPoints).fill(0);
  public m_points = new Array(b2_maxManifoldPoints).fill(0);

  constructor() {
    this.m_points = this.m_points.map(() => new Vec2());
  }

  public Initialize(cc: any) {
    b2Assert(cc.pointCount > 0);

    let clipPointX = 0;
    let clipPointY = 0;
    let tMat;
    let tVec;
    let planePointX = 0;
    let planePointY = 0;

    switch (cc.type) {
      case Manifold.e_circles:
        {
          tMat = cc.bodyA.m_xf.R;
          tVec = cc.localPoint;

          const pointAX =
            cc.bodyA.m_xf.position.x +
            (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
          const pointAY =
            cc.bodyA.m_xf.position.y +
            (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

          tMat = cc.bodyB.m_xf.R;
          tVec = cc.points[0].localPoint;

          const pointBX =
            cc.bodyB.m_xf.position.x +
            (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
          const pointBY =
            cc.bodyB.m_xf.position.y +
            (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

          const dX = pointBX - pointAX;
          const dY = pointBY - pointAY;
          const d2 = dX * dX + dY * dY;

          if (d2 > Number.MIN_VALUE * Number.MIN_VALUE) {
            const d = Math.sqrt(d2);
            this.m_normal.x = dX / d;
            this.m_normal.y = dY / d;
          } else {
            this.m_normal.x = 1.0;
            this.m_normal.y = 0.0;
          }

          this.m_points[0].x = 0.5 * (pointAX + pointBX);
          this.m_points[0].y = 0.5 * (pointAY + pointBY);

          this.m_separations[0] =
            dX * this.m_normal.x + dY * this.m_normal.y - cc.radius;
        }
        break;

      case Manifold.e_faceA:
        {
          tMat = cc.bodyA.m_xf.R;
          tVec = cc.localPlaneNormal;

          this.m_normal.x = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
          this.m_normal.y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

          tMat = cc.bodyA.m_xf.R;
          tVec = cc.localPoint;

          planePointX =
            cc.bodyA.m_xf.position.x +
            (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
          planePointY =
            cc.bodyA.m_xf.position.y +
            (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

          tMat = cc.bodyB.m_xf.R;

          for (let i = 0; i < cc.pointCount; ++i) {
            tVec = cc.points[i].localPoint;

            clipPointX =
              cc.bodyB.m_xf.position.x +
              (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
            clipPointY =
              cc.bodyB.m_xf.position.y +
              (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

            this.m_separations[i] =
              (clipPointX - planePointX) * this.m_normal.x +
              (clipPointY - planePointY) * this.m_normal.y -
              cc.radius;

            this.m_points[i].x = clipPointX;
            this.m_points[i].y = clipPointY;
          }
        }
        break;

      case Manifold.e_faceB:
        {
          tMat = cc.bodyB.m_xf.R;
          tVec = cc.localPlaneNormal;

          this.m_normal.x = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
          this.m_normal.y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

          tMat = cc.bodyB.m_xf.R;
          tVec = cc.localPoint;

          planePointX =
            cc.bodyB.m_xf.position.x +
            (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
          planePointY =
            cc.bodyB.m_xf.position.y +
            (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

          tMat = cc.bodyA.m_xf.R;

          for (let i = 0; i < cc.pointCount; ++i) {
            tVec = cc.points[i].localPoint;

            clipPointX =
              cc.bodyA.m_xf.position.x +
              (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
            clipPointY =
              cc.bodyA.m_xf.position.y +
              (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

            this.m_separations[i] =
              (clipPointX - planePointX) * this.m_normal.x +
              (clipPointY - planePointY) * this.m_normal.y -
              cc.radius;

            this.m_points[i].Set(clipPointX, clipPointY);
          }

          this.m_normal.x *= -1;
          this.m_normal.y *= -1;
        }
        break;
    }
  }
}

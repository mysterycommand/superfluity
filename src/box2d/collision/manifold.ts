// tslint:disable variable-name

import * as Settings from '../common/settings';
import Vec2 from '../common/math/vec2';
import ManifoldPoint from './manifold-point';

export default class Manifold {
  public static e_circles = 0x0001;
  public static e_faceA = 0x0002;
  public static e_faceB = 0x0004;

  public m_pointCount = 0;
  public m_points = new Array(Settings.b2_maxManifoldPoints);
  public m_localPlaneNormal = new Vec2();
  public m_localPoint = new Vec2();
  public m_type = 0;

  constructor() {
    for (let i = 0; i < Settings.b2_maxManifoldPoints; i++) {
      this.m_points[i] = new ManifoldPoint();
    }
  }

  public Reset() {
    for (let i = 0; i < Settings.b2_maxManifoldPoints; i++) {
      (this.m_points[i] instanceof ManifoldPoint
        ? this.m_points[i]
        : null
      ).Reset();
    }

    this.m_localPlaneNormal.SetZero();
    this.m_localPoint.SetZero();
    this.m_type = 0;
    this.m_pointCount = 0;
  }

  public Set(m: Manifold) {
    this.m_pointCount = m.m_pointCount;

    for (let i = 0; i < Settings.b2_maxManifoldPoints; i++) {
      (this.m_points[i] instanceof ManifoldPoint ? this.m_points[i] : null).Set(
        m.m_points[i],
      );
    }

    this.m_localPlaneNormal.SetV(m.m_localPlaneNormal);
    this.m_localPoint.SetV(m.m_localPoint);
    this.m_type = m.m_type;
  }

  public Copy() {
    const copy = new Manifold();
    copy.Set(this);
    return copy;
  }
}

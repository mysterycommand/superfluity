// tslint:disable variable-name

import ContactId from './contact-id';
import Vec2 from '../common/math/vec2';

export default class ManifoldPoint {
  public m_localPoint = new Vec2();
  public m_normalImpulse = 0.0;
  public m_tangentImpulse = 0.0;
  public m_id = new ContactId();

  constructor() {
    this.Reset();
  }

  public Reset() {
    this.m_localPoint.SetZero();
    this.m_normalImpulse = 0.0;
    this.m_tangentImpulse = 0.0;
    this.m_id.key = 0;
  }

  public Set(m: ManifoldPoint) {
    this.m_localPoint.SetV(m.m_localPoint);
    this.m_normalImpulse = m.m_normalImpulse;
    this.m_tangentImpulse = m.m_tangentImpulse;
    this.m_id.Set(m.m_id);
  }
}

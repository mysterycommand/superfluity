import Controller from './controller';
import TimeStep from '../time-step';
import Vec2 from '../../common/math/vec2';

export default class GravityController extends Controller {
  public G = 1;
  public invSqr = true;

  public Step(step: TimeStep) {
    if (!this.m_bodyList) {
      return;
    }

    if (this.invSqr) {
      for (let i = this.m_bodyList; i; i = i.nextBody) {
        const body1 = i.body;
        const p1 = body1.GetWorldCenter();
        const mass1 = body1.GetMass();

        for (let j = this.m_bodyList; j !== i; j = j.nextBody) {
          const body2 = j.body;
          const p2 = body2.GetWorldCenter();

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;

          const r2 = dx * dx + dy * dy;
          if (r2 < Number.MIN_VALUE) {
            continue;
          }

          const f = new Vec2(dx, dy);
          f.Multiply((this.G / r2 / Math.sqrt(r2)) * mass1 * body2.GetMass());
          if (body1.IsAwake()) {
            body1.ApplyForce(f, p1);
          }

          f.Multiply(-1);
          if (body2.IsAwake()) {
            body2.ApplyForce(f, p2);
          }
        }
      }
    } else {
      for (let i = this.m_bodyList; i; i = i.nextBody) {
        const body1 = i.body;
        const p1 = body1.GetWorldCenter();
        const mass1 = body1.GetMass();

        for (let j = this.m_bodyList; j !== i; j = j.nextBody) {
          const body2 = j.body;
          const p2 = body2.GetWorldCenter();
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const r2 = dx * dx + dy * dy;

          if (r2 < Number.MIN_VALUE) {
            continue;
          }

          const f = new Vec2(dx, dy);
          f.Multiply((this.G / r2) * mass1 * body2.GetMass());
          if (body1.IsAwake()) {
            body1.ApplyForce(f, p1);
          }

          f.Multiply(-1);
          if (body2.IsAwake()) {
            body2.ApplyForce(f, p2);
          }
        }
      }
    }
  }
}

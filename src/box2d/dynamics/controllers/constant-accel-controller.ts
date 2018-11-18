import Controller from './controller';
import Vec2 from '../../common/math/vec2';
import TimeStep from '../time-step';

export default class ConstantAccelController extends Controller {
  public A = new Vec2();

  public Step(step: TimeStep) {
    if (!this.m_bodyList) {
      return;
    }

    const smallA = new Vec2(this.A.x * step.dt, this.A.y * step.dt);
    for (let i = this.m_bodyList; i; i = i.nextBody) {
      const body = i.body;

      if (!body.IsAwake()) {
        continue;
      }

      body.SetLinearVelocity(
        new Vec2(
          body.GetLinearVelocity().x + smallA.x,
          body.GetLinearVelocity().y + smallA.y,
        ),
      );
    }
  }
}

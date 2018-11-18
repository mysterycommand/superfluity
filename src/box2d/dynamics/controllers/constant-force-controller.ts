import Controller from './controller';
import Vec2 from '../../common/math/vec2';
import TimeStep from '../time-step';

export default class ConstantForceController extends Controller {
  public F = new Vec2();

  public Step(step: TimeStep) {
    if (!this.m_bodyList) {
      return;
    }

    for (let i = this.m_bodyList; i; i = i.nextBody) {
      const body = i.body;

      if (!body.IsAwake()) {
        continue;
      }

      body.ApplyForce(this.F, body.GetWorldCenter());
    }
  }
}

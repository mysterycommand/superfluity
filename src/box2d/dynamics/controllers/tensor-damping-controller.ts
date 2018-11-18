import Controller from './controller';
import Mat22 from '../../common/math/mat22';
import TimeStep from '../time-step';
import { MulMV } from '../../common/math';
import Vec2 from '../../common/math/vec2';

export default class TensorDampingController extends Controller {
  public T = new Mat22();
  public maxTimestep = 0;

  public SetAxisAligned(xDamping = 0, yDamping = 0) {
    this.T.col1.x = -xDamping;
    this.T.col1.y = 0;

    this.T.col2.x = 0;
    this.T.col2.y = -yDamping;

    if (xDamping > 0 || yDamping > 0) {
      this.maxTimestep = 1 / Math.max(xDamping, yDamping);
    } else {
      this.maxTimestep = 0;
    }
  }

  public Step(step: TimeStep) {
    let timestep = step.dt;

    if (timestep <= Number.MIN_VALUE) {
      return;
    }

    if (timestep > this.maxTimestep && this.maxTimestep > 0) {
      timestep = this.maxTimestep;
    }

    for (let i = this.m_bodyList; i; i = i.nextBody) {
      const body = i.body;
      if (!body.IsAwake()) {
        continue;
      }

      const damping = body.GetWorldVector(
        MulMV(this.T, body.GetLocalVector(body.GetLinearVelocity())),
      );

      body.SetLinearVelocity(
        new Vec2(
          body.GetLinearVelocity().x + damping.x * timestep,
          body.GetLinearVelocity().y + damping.y * timestep,
        ),
      );
    }
  }
}

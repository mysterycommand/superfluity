import Controller from './controller';
import Vec2 from '../../common/math/vec2';
import TimeStep from '../time-step';
import DebugDraw from '../debug-draw';
import Color from '../../common/color';

export default class BouyancyController extends Controller {
  public normal = new Vec2(0, -1);
  public offset = 0;
  public density = 0;
  public velocity = new Vec2();
  public linearDrag = 2;
  public angularDrag = 1;
  public useDensity = false;
  public useWorldGravity = true;
  public gravity = new Vec2();

  public Step(step: TimeStep) {
    if (!this.m_bodyList) {
      return;
    }

    if (this.useWorldGravity) {
      const world = this.GetWorld();

      if (world) {
        this.gravity = world.GetGravity().Copy();
      }
    }

    for (let i = this.m_bodyList; i; i = i.nextBody) {
      const body = i.body;

      if (!body.IsAwake()) {
        continue;
      }

      const areac = new Vec2();
      const massc = new Vec2();

      let area = 0.0;
      let mass = 0.0;

      for (
        let fixture = body.GetFixtureList();
        fixture;
        fixture = fixture.GetNext()
      ) {
        const sc = new Vec2();
        const sarea = fixture
          .GetShape()
          .ComputeSubmergedArea(
            this.normal,
            this.offset,
            body.GetTransform(),
            sc,
          );

        area += sarea;
        areac.x += sarea * sc.x;
        areac.y += sarea * sc.y;

        let shapeDensity = 0;
        if (this.useDensity) {
          shapeDensity = 1;
        } else {
          shapeDensity = 1;
        }

        mass += sarea * shapeDensity;
        massc.x += sarea * sc.x * shapeDensity;
        massc.y += sarea * sc.y * shapeDensity;
      }

      areac.x /= area;
      areac.y /= area;

      massc.x /= mass;
      massc.y /= mass;

      if (area < Number.MIN_VALUE) {
        continue;
      }

      const buoyancyForce = this.gravity.GetNegative();
      buoyancyForce.Multiply(this.density * area);
      body.ApplyForce(buoyancyForce, massc);

      const dragForce = body.GetLinearVelocityFromWorldPoint(areac);
      dragForce.Subtract(this.velocity);
      dragForce.Multiply(-this.linearDrag * area);

      body.ApplyForce(dragForce, areac);
      body.ApplyTorque(
        (-body.GetInertia() / body.GetMass()) *
          area *
          body.GetAngularVelocity() *
          this.angularDrag,
      );
    }
  }

  public Draw(debugDraw: DebugDraw) {
    const r = 1000;
    const p1 = new Vec2();
    const p2 = new Vec2();

    p1.x = this.normal.x * this.offset + this.normal.y * r;
    p1.y = this.normal.y * this.offset - this.normal.x * r;

    p2.x = this.normal.x * this.offset - this.normal.y * r;
    p2.y = this.normal.y * this.offset + this.normal.x * r;

    const color = new Color(0, 0, 1);
    debugDraw.DrawSegment(p1, p2, color);
  }
}

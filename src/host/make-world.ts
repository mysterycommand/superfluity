import Vec2 from '../box2d/common/math/vec2';

import BodyDef from '../box2d/dynamics/body-def';
import Body from '../box2d/dynamics/body';
import DebugDraw from '../box2d/dynamics/debug-draw';
import FixtureDef from '../box2d/dynamics/fixture-def';
import World from '../box2d/dynamics/world';

import PolygonShape from '../box2d/collision/shapes/polygon-shape';
import CircleShape from '../box2d/collision/shapes/circle-shape';

export const ptm = 30;

export default function makeWorld(ctx: CanvasRenderingContext2D) {
  // tslint:disable no-bitwise
  const { canvas: c } = ctx;

  const world = new World(new Vec2(0, 30), false);

  // init world
  const fixDef = new FixtureDef();
  fixDef.density = 1.0;
  fixDef.friction = 0.5;
  fixDef.restitution = 0.2;

  const bodyDef = new BodyDef();

  // create ground
  bodyDef.type = Body.b2_staticBody;
  fixDef.shape = new PolygonShape();

  const ww = c.width / ptm;
  const wh = c.height / ptm;

  // top and bottom
  fixDef.shape.SetAsBox(ww / 2, 1);

  bodyDef.position.Set(ww / 2, -1);
  world.CreateBody(bodyDef).CreateFixture(fixDef);

  bodyDef.position.Set(ww / 2, wh + 1);
  world.CreateBody(bodyDef).CreateFixture(fixDef);

  // left and right
  fixDef.shape.SetAsBox(1, wh / 2);

  bodyDef.position.Set(-1, wh / 2);
  world.CreateBody(bodyDef).CreateFixture(fixDef);

  bodyDef.position.Set(ww + 1, wh / 2);
  world.CreateBody(bodyDef).CreateFixture(fixDef);

  // create some objects
  bodyDef.type = Body.b2_dynamicBody;

  fixDef.shape = new CircleShape(ww / 8);
  bodyDef.position.Set(ww / 2, wh / 2);
  world.CreateBody(bodyDef).CreateFixture(fixDef);

  // init debug draw
  const debugDraw = new DebugDraw();

  debugDraw.SetDrawScale(ptm);
  debugDraw.SetSprite(ctx);
  debugDraw.SetFillAlpha(0.5);
  debugDraw.SetLineThickness(1.0);
  debugDraw.SetFlags(DebugDraw.e_shapeBit | DebugDraw.e_jointBit);

  world.SetDebugDraw(debugDraw);

  const tick = (t: DOMHighResTimeStamp) => {
    requestAnimationFrame(tick);

    world.Step(1 / 60, 5, 5);
    world.DrawDebugData();
    world.ClearForces();
  };

  requestAnimationFrame(tick);

  return world;
}

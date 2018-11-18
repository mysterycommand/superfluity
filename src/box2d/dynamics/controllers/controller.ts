// tslint:disable variable-name

import DebugDraw from '../debug-draw';
import ControllerEdge from './controller-edge';
import TimeStep from '../time-step';
import World from '../world';

export default class Controller {
  public m_bodyList?: ControllerEdge;
  public m_bodyCount = 0;
  public m_next: any;
  public m_prev: any;
  public m_world?: World;

  public Step(step: TimeStep) {} // tslint:disable-line no-empty
  public Draw(debugDraw: DebugDraw) {} // tslint:disable-line no-empty

  public AddBody(body: any) {
    const edge = new ControllerEdge();
    edge.controller = this;
    edge.body = body;
    edge.nextBody = this.m_bodyList;
    edge.prevBody = null;
    this.m_bodyList = edge;

    if (edge.nextBody) {
      edge.nextBody.prevBody = edge;
    }

    this.m_bodyCount++;
    edge.nextController = body.m_controllerList;
    edge.prevController = null;
    body.m_controllerList = edge;

    if (edge.nextController) {
      edge.nextController.prevController = edge;
    }

    body.m_controllerCount++;
  }

  public RemoveBody(body: any) {
    let edge = body.m_controllerList;

    while (edge && edge.controller !== this) {
      edge = edge.nextController;
    }

    if (edge.prevBody) {
      edge.prevBody.nextBody = edge.nextBody;
    }

    if (edge.nextBody) {
      edge.nextBody.prevBody = edge.prevBody;
    }

    if (edge.nextController) {
      edge.nextController.prevController = edge.prevController;
    }

    if (edge.prevController) {
      edge.prevController.nextController = edge.nextController;
    }

    if (this.m_bodyList === edge) {
      this.m_bodyList = edge.nextBody;
    }

    if (body.m_controllerList === edge) {
      body.m_controllerList = edge.nextController;
    }

    body.m_controllerCount--;
    this.m_bodyCount--;
  }

  public Clear() {
    while (this.m_bodyList) {
      this.RemoveBody(this.m_bodyList.body);
    }
  }

  public GetNext() {
    return this.m_next;
  }

  public GetWorld() {
    return this.m_world;
  }

  public GetBodyList() {
    return this.m_bodyList;
  }
}

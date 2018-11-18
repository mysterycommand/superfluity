// tslint:disable variable-name

import ContactId from './contact-id';

export default class Features {
  public m_id?: ContactId;

  private _referenceEdge = 0;

  public get referenceEdge() {
    return this._referenceEdge;
  }

  public set referenceEdge(value: number) {
    if (this._referenceEdge === value) {
      return;
    }

    this._referenceEdge = value;
    (this.m_id as ContactId).key =
      ((this.m_id as ContactId).key & 0xffffff00) |
      (this._referenceEdge & 0x000000ff);
  }

  private _incidentEdge = 0;

  public get incidentEdge() {
    return this._incidentEdge;
  }

  public set incidentEdge(value: number) {
    if (this._incidentEdge === value) {
      return;
    }

    this._incidentEdge = value;
    (this.m_id as ContactId).key =
      ((this.m_id as ContactId).key & 0xffff00ff) |
      ((this._incidentEdge << 8) & 0x0000ff00);
  }

  private _incidentVertex = 0;

  public get incidentVertex() {
    return this._incidentVertex;
  }

  public set incidentVertex(value: number) {
    if (this._incidentVertex === value) {
      return;
    }

    this._incidentVertex = value;
    (this.m_id as ContactId).key =
      ((this.m_id as ContactId).key & 0xff00ffff) |
      ((this._incidentVertex << 16) & 0x00ff0000);
  }

  private _flip = 0;

  public get flip() {
    return this._flip;
  }

  public set flip(value: number) {
    if (this._flip === value) {
      return;
    }

    this._flip = value;
    (this.m_id as ContactId).key =
      ((this.m_id as ContactId).key & 0x00ffffff) |
      ((this._flip << 24) & 0xff000000);
  }
}

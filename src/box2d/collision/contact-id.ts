import Features from './features';

export default class ContactId {
  private _key = 0;

  public get key() {
    return this._key;
  }

  public set key(value: number) {
    if (this._key === value) {
      return;
    }

    this._key = value;

    this.features.referenceEdge = this._key & 0x000000ff;
    this.features.incidentEdge = ((this._key & 0x0000ff00) >> 8) & 0x000000ff;
    this.features.incidentVertex =
      ((this._key & 0x00ff0000) >> 16) & 0x000000ff;

    this.features.flip = ((this._key & 0xff000000) >> 24) & 0x000000ff;
  }

  constructor(public features = new Features()) {
    this.features.m_id = this;
  }

  public Set(id: ContactId) {
    this.key = id.key;
  }

  public Copy() {
    const id = new ContactId();
    id.key = this.key;
    return id;
  }
}

import Vec2 from '../common/math/vec2';
import ContactId from './contact-id';

export default class ClipVertex {
  public v = new Vec2();
  public id = new ContactId();

  public Set(other: ClipVertex) {
    this.v.SetV(other.v);
    this.id.Set(other.id);
  }
}

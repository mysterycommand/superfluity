import Vec2 from '../common/math/vec2';
import ContactId from './contact-id';

export default class ContactPoint {
  public position = new Vec2();
  public velocity = new Vec2();
  public normal = new Vec2();
  public id = new ContactId();
}

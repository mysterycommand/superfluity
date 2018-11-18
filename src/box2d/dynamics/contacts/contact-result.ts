import Vec2 from '../../common/math/vec2';
import ContactId from '../../collision/contact-id';

export default class ContactResult {
  public position = new Vec2();
  public normal = new Vec2();
  public id = new ContactId();
}

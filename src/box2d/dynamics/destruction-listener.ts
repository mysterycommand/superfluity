import Fixture from './fixture';
import Joint from './joints/joint';

export default class DestructionListener {
  public SayGoodbyeJoint(joint: Joint) {} // tslint:disable-line no-empty
  public SayGoodbyeFixture(fixture: Fixture) {} // tslint:disable-line no-empty
}

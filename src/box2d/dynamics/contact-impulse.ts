import { b2_maxManifoldPoints } from '../common/settings';

export default class ContactImpulse {
  public normalImpulses = new Array(b2_maxManifoldPoints);
  public tangentImpulses = new Array(b2_maxManifoldPoints);
}

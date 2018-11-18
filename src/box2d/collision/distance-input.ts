import Transform from '../common/math/transform';
import DistanceProxy from './distance-proxy';
import Sweep from '../common/math/sweep';

export default class DistanceInput {
  public proxyA = new DistanceProxy();
  public proxyB = new DistanceProxy();

  public transformA = new Transform();
  public transformB = new Transform();

  public sweepA = new Sweep();
  public sweepB = new Sweep();

  public useRadii = false;
}

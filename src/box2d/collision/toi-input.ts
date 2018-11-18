import DistanceProxy from './distance-proxy';
import Sweep from '../common/math/sweep';

export default class ToiInput {
  public proxyA = new DistanceProxy();
  public proxyB = new DistanceProxy();

  public sweepA = new Sweep();
  public sweepB = new Sweep();

  public tolerance = 1;
}

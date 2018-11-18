import Joint from './joint';
import Body from '../body';

export default class JointEdge {
  public joint?: Joint;
  public other?: Body;
  public prev?: JointEdge;
  public next?: JointEdge;
}

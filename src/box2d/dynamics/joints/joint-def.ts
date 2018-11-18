import Joint from './joint';
import Body from '../body';

export default class JointDef {
  public type = Joint.e_unknownJoint;
  public userData?: any;
  public bodyA?: Body;
  public bodyB?: Body;
  public collideConnected = false;
}

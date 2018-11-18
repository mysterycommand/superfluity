import JointDef from './joint-def';
import Vec2 from '../../common/math/vec2';
import Joint from './joint';

export default class MouseJointDef extends JointDef {
  public target = new Vec2();
  public type = Joint.e_mouseJoint;
  public maxForce = 0.0;
  public frequencyHz = 5.0;
  public dampingRatio = 0.7;
}

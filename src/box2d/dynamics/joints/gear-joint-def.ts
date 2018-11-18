import JointDef from './joint-def';
import Joint from './joint';

export default class GearJointDef extends JointDef {
  public type = Joint.e_gearJoint;

  public jointA?: Joint;
  public jointB?: Joint;

  public ratio = 1.0;
}

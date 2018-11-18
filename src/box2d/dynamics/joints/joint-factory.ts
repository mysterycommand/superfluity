import Joint from './joint';
import JointDef from './joint-def';
import MouseJoint from './mouse-joint';
import MouseJointDef from './mouse-joint-def';

export function Create(def: JointDef, allocator: any) {
  switch (def.type) {
    case Joint.e_distanceJoint:
      {
        // joint = new DistanceJoint(
        //   def instanceof DistanceJointDef ? def : null,
        // );
      }
      break;

    case Joint.e_mouseJoint:
      {
        return new MouseJoint(def as MouseJointDef);
      }
      break;

    case Joint.e_prismaticJoint:
      {
        // joint = new PrismaticJoint(
        //   def instanceof PrismaticJointDef ? def : null,
        // );
      }
      break;

    case Joint.e_revoluteJoint:
      {
        // joint = new RevoluteJoint(
        //   def instanceof RevoluteJointDef ? def : null,
        // );
      }
      break;

    case Joint.e_pulleyJoint:
      {
        // joint = new PulleyJoint(
        //   def instanceof PulleyJointDef ? def : null,
        // );
      }
      break;

    case Joint.e_gearJoint:
      {
        // joint = new GearJoint(def instanceof GearJointDef ? def : null);
      }
      break;

    case Joint.e_lineJoint:
      {
        // joint = new LineJoint(def instanceof LineJointDef ? def : null);
      }
      break;

    case Joint.e_weldJoint:
      {
        // joint = new WeldJoint(def instanceof WeldJointDef ? def : null);
      }
      break;

    case Joint.e_frictionJoint:
      {
        // joint = new FrictionJoint(
        //   def instanceof FrictionJointDef ? def : null,
        // );
      }
      break;

    default:
      break;
  }

  return new Joint(def);
}

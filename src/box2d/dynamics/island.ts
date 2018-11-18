// tslint:disable variable-name

import ContactImpulse from './contact-impulse';
import * as Settings from '../common/settings';
import { Clamp, Dot, Min } from '../common/math';
import TimeStep from './time-step';
import Vec2 from '../common/math/vec2';
import Body from './body';
import ContactSolver from './contacts/contact-solver';
import Contact from './contacts/contact';
import Joint from './joints/joint';

export default class Island {
  public static s_impulse = new ContactImpulse();

  public m_bodies = new Array();
  public m_contacts = new Array();
  public m_joints = new Array();

  public m_bodyCapacity = 0;
  public m_contactCapacity = 0;
  public m_jointCapacity = 0;

  public m_bodyCount = 0;
  public m_contactCount = 0;
  public m_jointCount = 0;

  public m_allocator = undefined;
  public m_listener = undefined;
  public m_contactSolver = new ContactSolver();

  public Initialize(
    bodyCapacity = 0,
    contactCapacity = 0,
    jointCapacity = 0,
    allocator: any,
    listener: any,
    contactSolver: any,
  ) {
    this.m_bodyCapacity = bodyCapacity;
    this.m_contactCapacity = contactCapacity;
    this.m_jointCapacity = jointCapacity;

    this.m_bodyCount = 0;
    this.m_contactCount = 0;
    this.m_jointCount = 0;

    this.m_allocator = allocator;
    this.m_listener = listener;
    this.m_contactSolver = contactSolver;

    for (let i = this.m_bodies.length; i < bodyCapacity; i++) {
      this.m_bodies[i] = null;
    }

    for (let i = this.m_contacts.length; i < contactCapacity; i++) {
      this.m_contacts[i] = null;
    }

    for (let i = this.m_joints.length; i < jointCapacity; i++) {
      this.m_joints[i] = null;
    }
  }

  public Clear() {
    this.m_bodyCount = 0;
    this.m_contactCount = 0;
    this.m_jointCount = 0;
  }

  public Solve(step: TimeStep, gravity: Vec2, allowSleep: boolean) {
    let i = 0;
    let j = 0;
    let b;
    let joint;

    for (i = 0; i < this.m_bodyCount; ++i) {
      b = this.m_bodies[i];

      if (b.GetType() !== Body.b2_dynamicBody) {
        continue;
      }

      b.m_linearVelocity.x += step.dt * (gravity.x + b.m_invMass * b.m_force.x);
      b.m_linearVelocity.y += step.dt * (gravity.y + b.m_invMass * b.m_force.y);
      b.m_angularVelocity += step.dt * b.m_invI * b.m_torque;

      b.m_linearVelocity.Multiply(
        Clamp(1.0 - step.dt * b.m_linearDamping, 0.0, 1.0),
      );

      b.m_angularVelocity *= Clamp(
        1.0 - step.dt * b.m_angularDamping,
        0.0,
        1.0,
      );
    }

    this.m_contactSolver.Initialize(
      step,
      this.m_contacts,
      this.m_contactCount,
      this.m_allocator,
    );

    const contactSolver = this.m_contactSolver;
    contactSolver.InitVelocityConstraints(step);

    for (i = 0; i < this.m_jointCount; ++i) {
      joint = this.m_joints[i];
      joint.InitVelocityConstraints(step);
    }

    for (i = 0; i < step.velocityIterations; ++i) {
      for (j = 0; j < this.m_jointCount; ++j) {
        joint = this.m_joints[j];
        joint.SolveVelocityConstraints(step);
      }
      contactSolver.SolveVelocityConstraints();
    }

    for (i = 0; i < this.m_jointCount; ++i) {
      joint = this.m_joints[i];
      joint.FinalizeVelocityConstraints();
    }
    contactSolver.FinalizeVelocityConstraints();

    for (i = 0; i < this.m_bodyCount; ++i) {
      b = this.m_bodies[i];

      if (b.GetType() === Body.b2_staticBody) {
        continue;
      }

      const translationX = step.dt * b.m_linearVelocity.x;
      const translationY = step.dt * b.m_linearVelocity.y;
      if (
        translationX * translationX + translationY * translationY >
        Settings.b2_maxTranslationSquared
      ) {
        b.m_linearVelocity.Normalize();
        b.m_linearVelocity.x *= Settings.b2_maxTranslation * step.inv_dt;
        b.m_linearVelocity.y *= Settings.b2_maxTranslation * step.inv_dt;
      }

      const rotation = step.dt * b.m_angularVelocity;
      if (rotation * rotation > Settings.b2_maxRotationSquared) {
        if (b.m_angularVelocity < 0.0) {
          b.m_angularVelocity = -Settings.b2_maxRotation * step.inv_dt;
        } else {
          b.m_angularVelocity = Settings.b2_maxRotation * step.inv_dt;
        }
      }

      b.m_sweep.c0.SetV(b.m_sweep.c);
      b.m_sweep.a0 = b.m_sweep.a;
      b.m_sweep.c.x += step.dt * b.m_linearVelocity.x;
      b.m_sweep.c.y += step.dt * b.m_linearVelocity.y;
      b.m_sweep.a += step.dt * b.m_angularVelocity;
      b.SynchronizeTransform();
    }

    for (i = 0; i < step.positionIterations; ++i) {
      const contactsOkay = contactSolver.SolvePositionConstraints(
        Settings.b2_contactBaumgarte,
      );
      let jointsOkay = true;

      for (j = 0; j < this.m_jointCount; ++j) {
        joint = this.m_joints[j];

        const jointOkay = joint.SolvePositionConstraints(
          Settings.b2_contactBaumgarte,
        );

        jointsOkay = jointsOkay && jointOkay;
      }

      if (contactsOkay && jointsOkay) {
        break;
      }
    }

    this.Report(contactSolver.m_constraints);

    if (allowSleep) {
      let minSleepTime = Number.MAX_VALUE;

      const linTolSqr =
        Settings.b2_linearSleepTolerance * Settings.b2_linearSleepTolerance;
      const angTolSqr =
        Settings.b2_angularSleepTolerance * Settings.b2_angularSleepTolerance;

      for (i = 0; i < this.m_bodyCount; ++i) {
        b = this.m_bodies[i];

        if (b.GetType() === Body.b2_staticBody) {
          continue;
        }

        if ((b.m_flags & Body.e_allowSleepFlag) === 0) {
          b.m_sleepTime = 0.0;
          minSleepTime = 0.0;
        }

        if (
          (b.m_flags & Body.e_allowSleepFlag) === 0 ||
          b.m_angularVelocity * b.m_angularVelocity > angTolSqr ||
          Dot(b.m_linearVelocity, b.m_linearVelocity) > linTolSqr
        ) {
          b.m_sleepTime = 0.0;
          minSleepTime = 0.0;
        } else {
          b.m_sleepTime += step.dt;
          minSleepTime = Min(minSleepTime, b.m_sleepTime);
        }
      }

      if (minSleepTime >= Settings.b2_timeToSleep) {
        for (i = 0; i < this.m_bodyCount; ++i) {
          b = this.m_bodies[i];
          b.SetAwake(false);
        }
      }
    }
  }

  public SolveTOI(subStep: TimeStep) {
    let i = 0;
    let j = 0;

    this.m_contactSolver.Initialize(
      subStep,
      this.m_contacts,
      this.m_contactCount,
      this.m_allocator,
    );

    const contactSolver = this.m_contactSolver;
    for (i = 0; i < this.m_jointCount; ++i) {
      this.m_joints[i].InitVelocityConstraints(subStep);
    }

    for (i = 0; i < subStep.velocityIterations; ++i) {
      contactSolver.SolveVelocityConstraints();

      for (j = 0; j < this.m_jointCount; ++j) {
        this.m_joints[j].SolveVelocityConstraints(subStep);
      }
    }

    for (i = 0; i < this.m_bodyCount; ++i) {
      const b = this.m_bodies[i];
      if (b.GetType() === Body.b2_staticBody) {
        continue;
      }

      const translationX = subStep.dt * b.m_linearVelocity.x;
      const translationY = subStep.dt * b.m_linearVelocity.y;
      if (
        translationX * translationX + translationY * translationY >
        Settings.b2_maxTranslationSquared
      ) {
        b.m_linearVelocity.Normalize();
        b.m_linearVelocity.x *= Settings.b2_maxTranslation * subStep.inv_dt;
        b.m_linearVelocity.y *= Settings.b2_maxTranslation * subStep.inv_dt;
      }

      const rotation = subStep.dt * b.m_angularVelocity;
      if (rotation * rotation > Settings.b2_maxRotationSquared) {
        if (b.m_angularVelocity < 0.0) {
          b.m_angularVelocity = -Settings.b2_maxRotation * subStep.inv_dt;
        } else {
          b.m_angularVelocity = Settings.b2_maxRotation * subStep.inv_dt;
        }
      }

      b.m_sweep.c0.SetV(b.m_sweep.c);
      b.m_sweep.a0 = b.m_sweep.a;
      b.m_sweep.c.x += subStep.dt * b.m_linearVelocity.x;
      b.m_sweep.c.y += subStep.dt * b.m_linearVelocity.y;
      b.m_sweep.a += subStep.dt * b.m_angularVelocity;
      b.SynchronizeTransform();
    }

    const k_toiBaumgarte = 0.75;
    for (i = 0; i < subStep.positionIterations; ++i) {
      const contactsOkay = contactSolver.SolvePositionConstraints(
        k_toiBaumgarte,
      );
      let jointsOkay = true;

      for (j = 0; j < this.m_jointCount; ++j) {
        const jointOkay = this.m_joints[j].SolvePositionConstraints(
          Settings.b2_contactBaumgarte,
        );
        jointsOkay = jointsOkay && jointOkay;
      }

      if (contactsOkay && jointsOkay) {
        break;
      }
    }

    this.Report(contactSolver.m_constraints);
  }

  public Report(constraints: any[]) {
    if (!this.m_listener) {
      return;
    }

    for (let i = 0; i < this.m_contactCount; ++i) {
      const c = this.m_contacts[i];
      const cc = constraints[i];

      for (let j = 0; j < cc.pointCount; ++j) {
        Island.s_impulse.normalImpulses[j] = cc.points[j].normalImpulse;
        Island.s_impulse.tangentImpulses[j] = cc.points[j].tangentImpulse;
      }

      // this.m_listener.PostSolve(c, Island.s_impulse);
    }
  }

  public AddBody(body: Body) {
    body.m_islandIndex = this.m_bodyCount;
    this.m_bodies[this.m_bodyCount++] = body;
  }

  public AddContact(contact: Contact) {
    this.m_contacts[this.m_contactCount++] = contact;
  }

  public AddJoint(joint: Joint) {
    this.m_joints[this.m_jointCount++] = joint;
  }
}

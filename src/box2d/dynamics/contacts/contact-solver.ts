// tslint:disable variable-name

import TimeStep from '../time-step';
import WorldManifold from '../../collision/world-manifold';
import PositionSolverManifold from './position-solver-manifold';
import ContactConstraint from './contact-constraint';
import Contact from './contact';
import {
  b2Assert,
  b2_velocityThreshold,
  b2MixFriction,
  b2MixRestitution,
  b2_linearSlop,
  b2_maxLinearCorrection,
} from '../../common/settings';
import { Clamp } from '../../common/math';

export default class ContactSolver {
  public static s_worldManifold = new WorldManifold();
  public static s_psm = new PositionSolverManifold();

  public m_step = new TimeStep();
  public m_constraints = new Array();
  public m_constraintCount = 0;

  public m_allocator: any;

  public Initialize(
    step: TimeStep,
    contacts: Contact[],
    contactCount = 0,
    allocator: any,
  ) {
    let contact;
    this.m_step.Set(step);
    this.m_allocator = allocator;

    let i = 0;
    // let tVec;
    // let tMat;
    this.m_constraintCount = contactCount;

    while (this.m_constraints.length < this.m_constraintCount) {
      this.m_constraints[this.m_constraints.length] = new ContactConstraint();
    }

    for (i = 0; i < contactCount; ++i) {
      contact = contacts[i];

      const fixtureA = contact.m_fixtureA;
      const fixtureB = contact.m_fixtureB;

      if (!(fixtureA && fixtureB)) {
        continue;
      }

      const shapeA = fixtureA.m_shape;
      const shapeB = fixtureB.m_shape;

      if (!(shapeA && shapeB)) {
        continue;
      }

      const radiusA = shapeA.m_radius;
      const radiusB = shapeB.m_radius;

      const bodyA = fixtureA.m_body;
      const bodyB = fixtureB.m_body;

      if (!(bodyA && bodyB)) {
        continue;
      }

      const manifold = contact.GetManifold();

      const friction = b2MixFriction(
        fixtureA.GetFriction(),
        fixtureB.GetFriction(),
      );

      const restitution = b2MixRestitution(
        fixtureA.GetRestitution(),
        fixtureB.GetRestitution(),
      );

      const vAX = bodyA.m_linearVelocity.x;
      const vAY = bodyA.m_linearVelocity.y;

      const vBX = bodyB.m_linearVelocity.x;
      const vBY = bodyB.m_linearVelocity.y;

      const wA = bodyA.m_angularVelocity;
      const wB = bodyB.m_angularVelocity;

      b2Assert(manifold.m_pointCount > 0);
      ContactSolver.s_worldManifold.Initialize(
        manifold,
        bodyA.m_xf,
        radiusA,
        bodyB.m_xf,
        radiusB,
      );

      const normalX = ContactSolver.s_worldManifold.m_normal.x;
      const normalY = ContactSolver.s_worldManifold.m_normal.y;
      const cc = this.m_constraints[i];

      cc.bodyA = bodyA;
      cc.bodyB = bodyB;

      cc.manifold = manifold;
      cc.normal.x = normalX;
      cc.normal.y = normalY;

      cc.pointCount = manifold.m_pointCount;
      cc.friction = friction;
      cc.restitution = restitution;

      cc.localPlaneNormal.x = manifold.m_localPlaneNormal.x;
      cc.localPlaneNormal.y = manifold.m_localPlaneNormal.y;

      cc.localPoint.x = manifold.m_localPoint.x;
      cc.localPoint.y = manifold.m_localPoint.y;

      cc.radius = radiusA + radiusB;
      cc.type = manifold.m_type;

      for (let k = 0; k < cc.pointCount; ++k) {
        const cp = manifold.m_points[k];
        const ccp = cc.points[k];

        ccp.normalImpulse = cp.m_normalImpulse;
        ccp.tangentImpulse = cp.m_tangentImpulse;
        ccp.localPoint.SetV(cp.m_localPoint);

        const rAX = (ccp.rA.x =
          ContactSolver.s_worldManifold.m_points[k].x - bodyA.m_sweep.c.x);
        const rAY = (ccp.rA.y =
          ContactSolver.s_worldManifold.m_points[k].y - bodyA.m_sweep.c.y);

        const rBX = (ccp.rB.x =
          ContactSolver.s_worldManifold.m_points[k].x - bodyB.m_sweep.c.x);
        const rBY = (ccp.rB.y =
          ContactSolver.s_worldManifold.m_points[k].y - bodyB.m_sweep.c.y);

        let rnA = rAX * normalY - rAY * normalX;
        let rnB = rBX * normalY - rBY * normalX;

        rnA *= rnA;
        rnB *= rnB;

        const kNormal =
          bodyA.m_invMass +
          bodyB.m_invMass +
          bodyA.m_invI * rnA +
          bodyB.m_invI * rnB;

        ccp.normalMass = 1.0 / kNormal;

        let kEqualized =
          bodyA.m_mass * bodyA.m_invMass + bodyB.m_mass * bodyB.m_invMass;
        kEqualized +=
          bodyA.m_mass * bodyA.m_invI * rnA + bodyB.m_mass * bodyB.m_invI * rnB;

        ccp.equalizedMass = 1.0 / kEqualized;

        const tangentX = normalY;
        const tangentY = -normalX;

        let rtA = rAX * tangentY - rAY * tangentX;
        let rtB = rBX * tangentY - rBY * tangentX;

        rtA *= rtA;
        rtB *= rtB;

        const kTangent =
          bodyA.m_invMass +
          bodyB.m_invMass +
          bodyA.m_invI * rtA +
          bodyB.m_invI * rtB;

        ccp.tangentMass = 1.0 / kTangent;
        ccp.velocityBias = 0.0;

        const tX = vBX + -wB * rBY - vAX - -wA * rAY;
        const tY = vBY + wB * rBX - vAY - wA * rAX;

        const vRel = cc.normal.x * tX + cc.normal.y * tY;

        if (vRel < -b2_velocityThreshold) {
          ccp.velocityBias += -cc.restitution * vRel;
        }
      }

      if (cc.pointCount === 2) {
        const ccp1 = cc.points[0];
        const ccp2 = cc.points[1];

        const invMassA = bodyA.m_invMass;
        const invIA = bodyA.m_invI;

        const invMassB = bodyB.m_invMass;
        const invIB = bodyB.m_invI;

        const rn1A = ccp1.rA.x * normalY - ccp1.rA.y * normalX;
        const rn1B = ccp1.rB.x * normalY - ccp1.rB.y * normalX;

        const rn2A = ccp2.rA.x * normalY - ccp2.rA.y * normalX;
        const rn2B = ccp2.rB.x * normalY - ccp2.rB.y * normalX;

        const k11 =
          invMassA + invMassB + invIA * rn1A * rn1A + invIB * rn1B * rn1B;
        const k22 =
          invMassA + invMassB + invIA * rn2A * rn2A + invIB * rn2B * rn2B;
        const k12 =
          invMassA + invMassB + invIA * rn1A * rn2A + invIB * rn1B * rn2B;

        const k_maxConditionNumber = 100.0;

        if (k11 * k11 < k_maxConditionNumber * (k11 * k22 - k12 * k12)) {
          cc.K.col1.Set(k11, k12);
          cc.K.col2.Set(k12, k22);
          cc.K.GetInverse(cc.normalMass);
        } else {
          cc.pointCount = 1;
        }
      }
    }
  }

  public InitVelocityConstraints(step: TimeStep) {
    // let tVec;
    // let tVec2;
    // let tMat;

    for (let i = 0; i < this.m_constraintCount; ++i) {
      const c = this.m_constraints[i];

      const bodyA = c.bodyA;
      const bodyB = c.bodyB;

      const invMassA = bodyA.m_invMass;
      const invIA = bodyA.m_invI;

      const invMassB = bodyB.m_invMass;
      const invIB = bodyB.m_invI;

      const normalX = c.normal.x;
      const normalY = c.normal.y;

      const tangentX = normalY;
      const tangentY = -normalX;

      // const tX = 0;
      let tCount = 0;

      if (step.warmStarting) {
        tCount = c.pointCount;
        for (let j = 0; j < tCount; ++j) {
          const ccp = c.points[j];

          ccp.normalImpulse *= step.dtRatio;
          ccp.tangentImpulse *= step.dtRatio;

          const PX =
            ccp.normalImpulse * normalX + ccp.tangentImpulse * tangentX;
          const PY =
            ccp.normalImpulse * normalY + ccp.tangentImpulse * tangentY;

          bodyA.m_angularVelocity -= invIA * (ccp.rA.x * PY - ccp.rA.y * PX);
          bodyA.m_linearVelocity.x -= invMassA * PX;
          bodyA.m_linearVelocity.y -= invMassA * PY;

          bodyB.m_angularVelocity += invIB * (ccp.rB.x * PY - ccp.rB.y * PX);
          bodyB.m_linearVelocity.x += invMassB * PX;
          bodyB.m_linearVelocity.y += invMassB * PY;
        }
      } else {
        tCount = c.pointCount;

        for (let j = 0; j < tCount; ++j) {
          const ccp2 = c.points[j];
          ccp2.normalImpulse = 0.0;
          ccp2.tangentImpulse = 0.0;
        }
      }
    }
  }

  public SolveVelocityConstraints() {
    let ccp;

    // const rAX = 0;
    // const rAY = 0;

    // const rBX = 0;
    // const rBY = 0;

    let dvX = 0;
    let dvY = 0;

    let vn = 0;
    let vt = 0;

    let lambda = 0;
    let maxFriction = 0;
    let newImpulse = 0;

    let PX = 0;
    let PY = 0;

    let dX = 0;
    let dY = 0;

    let P1X = 0;
    let P1Y = 0;

    let P2X = 0;
    let P2Y = 0;

    let tMat;
    // let tVec;

    for (let i = 0; i < this.m_constraintCount; ++i) {
      const c = this.m_constraints[i];

      const bodyA = c.bodyA;
      const bodyB = c.bodyB;

      let wA = bodyA.m_angularVelocity;
      let wB = bodyB.m_angularVelocity;

      const vA = bodyA.m_linearVelocity;
      const vB = bodyB.m_linearVelocity;

      const invMassA = bodyA.m_invMass;
      const invIA = bodyA.m_invI;

      const invMassB = bodyB.m_invMass;
      const invIB = bodyB.m_invI;

      const normalX = c.normal.x;
      const normalY = c.normal.y;

      const tangentX = normalY;
      const tangentY = -normalX;

      const friction = c.friction;
      // const tX = 0;

      for (let j = 0; j < c.pointCount; j++) {
        ccp = c.points[j];

        dvX = vB.x - wB * ccp.rB.y - vA.x + wA * ccp.rA.y;
        dvY = vB.y + wB * ccp.rB.x - vA.y - wA * ccp.rA.x;

        vt = dvX * tangentX + dvY * tangentY;

        lambda = ccp.tangentMass * -vt;
        maxFriction = friction * ccp.normalImpulse;
        newImpulse = Clamp(
          ccp.tangentImpulse + lambda,
          -maxFriction,
          maxFriction,
        );

        lambda = newImpulse - ccp.tangentImpulse;
        PX = lambda * tangentX;
        PY = lambda * tangentY;
        vA.x -= invMassA * PX;
        vA.y -= invMassA * PY;
        wA -= invIA * (ccp.rA.x * PY - ccp.rA.y * PX);
        vB.x += invMassB * PX;
        vB.y += invMassB * PY;
        wB += invIB * (ccp.rB.x * PY - ccp.rB.y * PX);
        ccp.tangentImpulse = newImpulse;
      }

      // let tCount = parseInt(`${c.pointCount}`, 10);
      if (c.pointCount === 1) {
        ccp = c.points[0];

        dvX = vB.x + -wB * ccp.rB.y - vA.x - -wA * ccp.rA.y;
        dvY = vB.y + wB * ccp.rB.x - vA.y - wA * ccp.rA.x;

        vn = dvX * normalX + dvY * normalY;

        lambda = -ccp.normalMass * (vn - ccp.velocityBias);
        newImpulse = ccp.normalImpulse + lambda;
        newImpulse = newImpulse > 0 ? newImpulse : 0.0;
        lambda = newImpulse - ccp.normalImpulse;

        PX = lambda * normalX;
        PY = lambda * normalY;

        vA.x -= invMassA * PX;
        vA.y -= invMassA * PY;

        wA -= invIA * (ccp.rA.x * PY - ccp.rA.y * PX);
        vB.x += invMassB * PX;
        vB.y += invMassB * PY;
        wB += invIB * (ccp.rB.x * PY - ccp.rB.y * PX);

        ccp.normalImpulse = newImpulse;
      } else {
        const cp1 = c.points[0];
        const cp2 = c.points[1];

        const aX = cp1.normalImpulse;
        const aY = cp2.normalImpulse;

        const dv1X = vB.x - wB * cp1.rB.y - vA.x + wA * cp1.rA.y;
        const dv1Y = vB.y + wB * cp1.rB.x - vA.y - wA * cp1.rA.x;

        const dv2X = vB.x - wB * cp2.rB.y - vA.x + wA * cp2.rA.y;
        const dv2Y = vB.y + wB * cp2.rB.x - vA.y - wA * cp2.rA.x;

        let vn1 = dv1X * normalX + dv1Y * normalY;
        let vn2 = dv2X * normalX + dv2Y * normalY;

        let bX = vn1 - cp1.velocityBias;
        let bY = vn2 - cp2.velocityBias;

        tMat = c.K;
        bX -= tMat.col1.x * aX + tMat.col2.x * aY;
        bY -= tMat.col1.y * aX + tMat.col2.y * aY;

        // const k_errorTol = 0.001;
        for (;;) {
          tMat = c.normalMass;
          let xX = -(tMat.col1.x * bX + tMat.col2.x * bY);
          let xY = -(tMat.col1.y * bX + tMat.col2.y * bY);

          if (xX >= 0.0 && xY >= 0.0) {
            dX = xX - aX;
            dY = xY - aY;

            P1X = dX * normalX;
            P1Y = dX * normalY;

            P2X = dY * normalX;
            P2Y = dY * normalY;

            vA.x -= invMassA * (P1X + P2X);
            vA.y -= invMassA * (P1Y + P2Y);

            wA -=
              invIA *
              (cp1.rA.x * P1Y -
                cp1.rA.y * P1X +
                cp2.rA.x * P2Y -
                cp2.rA.y * P2X);

            vB.x += invMassB * (P1X + P2X);
            vB.y += invMassB * (P1Y + P2Y);

            wB +=
              invIB *
              (cp1.rB.x * P1Y -
                cp1.rB.y * P1X +
                cp2.rB.x * P2Y -
                cp2.rB.y * P2X);

            cp1.normalImpulse = xX;
            cp2.normalImpulse = xY;
            break;
          }

          xX = -cp1.normalMass * bX;
          xY = 0.0;
          vn1 = 0.0;
          vn2 = c.K.col1.y * xX + bY;

          if (xX >= 0.0 && vn2 >= 0.0) {
            dX = xX - aX;
            dY = xY - aY;

            P1X = dX * normalX;
            P1Y = dX * normalY;

            P2X = dY * normalX;
            P2Y = dY * normalY;

            vA.x -= invMassA * (P1X + P2X);
            vA.y -= invMassA * (P1Y + P2Y);

            wA -=
              invIA *
              (cp1.rA.x * P1Y -
                cp1.rA.y * P1X +
                cp2.rA.x * P2Y -
                cp2.rA.y * P2X);

            vB.x += invMassB * (P1X + P2X);
            vB.y += invMassB * (P1Y + P2Y);

            wB +=
              invIB *
              (cp1.rB.x * P1Y -
                cp1.rB.y * P1X +
                cp2.rB.x * P2Y -
                cp2.rB.y * P2X);

            cp1.normalImpulse = xX;
            cp2.normalImpulse = xY;
            break;
          }

          xX = 0.0;
          xY = -cp2.normalMass * bY;

          vn1 = c.K.col2.x * xY + bX;
          vn2 = 0.0;

          if (xY >= 0.0 && vn1 >= 0.0) {
            dX = xX - aX;
            dY = xY - aY;

            P1X = dX * normalX;
            P1Y = dX * normalY;

            P2X = dY * normalX;
            P2Y = dY * normalY;

            vA.x -= invMassA * (P1X + P2X);
            vA.y -= invMassA * (P1Y + P2Y);

            wA -=
              invIA *
              (cp1.rA.x * P1Y -
                cp1.rA.y * P1X +
                cp2.rA.x * P2Y -
                cp2.rA.y * P2X);

            vB.x += invMassB * (P1X + P2X);
            vB.y += invMassB * (P1Y + P2Y);

            wB +=
              invIB *
              (cp1.rB.x * P1Y -
                cp1.rB.y * P1X +
                cp2.rB.x * P2Y -
                cp2.rB.y * P2X);

            cp1.normalImpulse = xX;
            cp2.normalImpulse = xY;
            break;
          }

          xX = 0.0;
          xY = 0.0;

          vn1 = bX;
          vn2 = bY;

          if (vn1 >= 0.0 && vn2 >= 0.0) {
            dX = xX - aX;
            dY = xY - aY;

            P1X = dX * normalX;
            P1Y = dX * normalY;

            P2X = dY * normalX;
            P2Y = dY * normalY;

            vA.x -= invMassA * (P1X + P2X);
            vA.y -= invMassA * (P1Y + P2Y);

            wA -=
              invIA *
              (cp1.rA.x * P1Y -
                cp1.rA.y * P1X +
                cp2.rA.x * P2Y -
                cp2.rA.y * P2X);

            vB.x += invMassB * (P1X + P2X);
            vB.y += invMassB * (P1Y + P2Y);

            wB +=
              invIB *
              (cp1.rB.x * P1Y -
                cp1.rB.y * P1X +
                cp2.rB.x * P2Y -
                cp2.rB.y * P2X);

            cp1.normalImpulse = xX;
            cp2.normalImpulse = xY;
            break;
          }

          break;
        }
      }

      bodyA.m_angularVelocity = wA;
      bodyB.m_angularVelocity = wB;
    }
  }

  public FinalizeVelocityConstraints() {
    for (let i = 0; i < this.m_constraintCount; ++i) {
      const c = this.m_constraints[i];
      const m = c.manifold;

      for (let j = 0; j < c.pointCount; ++j) {
        const point1 = m.m_points[j];
        const point2 = c.points[j];

        point1.m_normalImpulse = point2.normalImpulse;
        point1.m_tangentImpulse = point2.tangentImpulse;
      }
    }
  }

  public SolvePositionConstraints(baumgarte = 0) {
    let minSeparation = 0.0;
    for (let i = 0; i < this.m_constraintCount; i++) {
      const c = this.m_constraints[i];

      const bodyA = c.bodyA;
      const bodyB = c.bodyB;

      const invMassA = bodyA.m_mass * bodyA.m_invMass;
      const invIA = bodyA.m_mass * bodyA.m_invI;

      const invMassB = bodyB.m_mass * bodyB.m_invMass;
      const invIB = bodyB.m_mass * bodyB.m_invI;

      ContactSolver.s_psm.Initialize(c);
      const normal = ContactSolver.s_psm.m_normal;

      for (let j = 0; j < c.pointCount; j++) {
        const ccp = c.points[j];
        const point = ContactSolver.s_psm.m_points[j];
        const separation = ContactSolver.s_psm.m_separations[j];

        const rAX = point.x - bodyA.m_sweep.c.x;
        const rAY = point.y - bodyA.m_sweep.c.y;

        const rBX = point.x - bodyB.m_sweep.c.x;
        const rBY = point.y - bodyB.m_sweep.c.y;

        minSeparation = minSeparation < separation ? minSeparation : separation;
        const C = Clamp(
          baumgarte * (separation + b2_linearSlop),
          -b2_maxLinearCorrection,
          0.0,
        );

        const impulse = -ccp.equalizedMass * C;

        const PX = impulse * normal.x;
        const PY = impulse * normal.y;

        bodyA.m_sweep.c.x -= invMassA * PX;
        bodyA.m_sweep.c.y -= invMassA * PY;
        bodyA.m_sweep.a -= invIA * (rAX * PY - rAY * PX);
        bodyA.SynchronizeTransform();

        bodyB.m_sweep.c.x += invMassB * PX;
        bodyB.m_sweep.c.y += invMassB * PY;
        bodyB.m_sweep.a += invIB * (rBX * PY - rBY * PX);
        bodyB.SynchronizeTransform();
      }
    }

    return minSeparation > -1.5 * b2_linearSlop;
  }
}

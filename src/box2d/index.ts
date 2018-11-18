/*
 * Copyright (c) 2006-2007 Erin Catto http://www.gphysics.com
 *
 * This software is provided 'as-is', without any express or implied
 * warranty.  In no event will the authors be held liable for any damages
 * arising from the use of this software.
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 * 1. The origin of this software must not be misrepresented; you must not
 * claim that you wrote the original software. If you use this software
 * in a product, an acknowledgment in the product documentation would be
 * appreciated but is not required.
 * 2. Altered source versions must be plainly marked as such, and must not be
 * misrepresented as being the original software.
 * 3. This notice may not be removed or altered from any source distribution.
 */

import Aabb from './collision/aabb';
import BoundValues from './collision/bound-values';
import Bound from './collision/bound';
import ClipVertex from './collision/clip-vertex';
import ContactId from './collision/contact-id';
import ContactPoint from './collision/contact-point';
import DistanceInput from './collision/distance-input';
import DistanceOutput from './collision/distance-output';
import DistanceProxy from './collision/distance-proxy';
import * as Distance from './collision/distance';
import DynamicTreeBroadPhase from './collision/dynamic-tree-broad-phase';
import DynamicTreeNode from './collision/dynamic-tree-node';
import DynamicTreePair from './collision/dynamic-tree-pair';
import DynamicTree from './collision/dynamic-tree';
import Features from './collision/features';
import * as Collision from './collision/index';
import ManifoldPoint from './collision/manifold-point';
import Manifold from './collision/manifold';
import Point from './collision/point';
import RayCastInput from './collision/ray-cast-input';
import RayCastOutput from './collision/ray-cast-output';
import Segment from './collision/segment';
import SeparationFunction from './collision/separation-function';
import SimplexCache from './collision/simplex-cache';
import SimplexVertex from './collision/simplex-vertex';
import Simplex from './collision/simplex';
import * as TimeOfImpact from './collision/time-of-impact';
import ToiInput from './collision/toi-input';
import WorldManifold from './collision/world-manifold';

import CircleShape from './collision/shapes/circle-shape';
import EdgeChainDef from './collision/shapes/edge-chain-def';
import EdgeShape from './collision/shapes/edge-shape';
import MassData from './collision/shapes/mass-data';
import PolygonShape from './collision/shapes/polygon-shape';
import Shape from './collision/shapes/shape';

import Color from './common/color';
import * as Settings from './common/settings';

import * as Maths from './common/math/index';
import Mat22 from './common/math/mat22';
import Mat33 from './common/math/mat33';
import Sweep from './common/math/sweep';
import Transform from './common/math/transform';
import Vec2 from './common/math/vec2';
import Vec3 from './common/math/vec3';

import BodyDef from './dynamics/body-def';
import Body from './dynamics/body';
import ContactFilter from './dynamics/contact-filter';
import ContactImpulse from './dynamics/contact-impulse';
import ContactListener from './dynamics/contact-listener';
import ContactManager from './dynamics/contact-manager';
import DebugDraw from './dynamics/debug-draw';
import DestructionListener from './dynamics/destruction-listener';
import FilterData from './dynamics/filter-data';
import FixtureDef from './dynamics/fixture-def';
import Fixture from './dynamics/fixture';
import Island from './dynamics/island';
import TimeStep from './dynamics/time-step';
import World from './dynamics/world';

import CircleContact from './dynamics/contacts/circle-contact';
import ContactConstraintPoint from './dynamics/contacts/contact-constraint-point';
import ContactConstraint from './dynamics/contacts/contact-constraint';
import ContactEdge from './dynamics/contacts/contact-edge';
import ContactFactory from './dynamics/contacts/contact-factory';
import ContactRegister from './dynamics/contacts/contact-register';
import ContactResult from './dynamics/contacts/contact-result';
import ContactSolver from './dynamics/contacts/contact-solver';
import Contact from './dynamics/contacts/contact';
import EdgeAndCircleContact from './dynamics/contacts/edge-and-circle-contact';
import NullContact from './dynamics/contacts/null-contact';
import PolyAndCircleContact from './dynamics/contacts/poly-and-circle-contact';
import PolyAndEdgeContact from './dynamics/contacts/poly-and-edge-contact';
import PolygonContact from './dynamics/contacts/polygon-contact';
import PositionSolverManifold from './dynamics/contacts/position-solver-manifold';

import BuoyancyController from './dynamics/controllers/buoyancy-controller';
import ConstantAccelController from './dynamics/controllers/constant-accel-controller';
import ConstantForceController from './dynamics/controllers/constant-force-controller';
import ControllerEdge from './dynamics/controllers/controller-edge';
import Controller from './dynamics/controllers/controller';
import GravityController from './dynamics/controllers/gravity-controller';
import TensorDampingController from './dynamics/controllers/tensor-damping-controller';

import DistanceJointDef from './dynamics/joints/distance-joint-def';
import DistanceJoint from './dynamics/joints/distance-joint';
import FrictionJointDef from './dynamics/joints/friction-joint-def';
import FrictionJoint from './dynamics/joints/friction-joint';
import GearJointDef from './dynamics/joints/gear-joint-def';
import GearJoint from './dynamics/joints/gear-joint';
import Jacobian from './dynamics/joints/jacobian';
import JointDef from './dynamics/joints/joint-def';
import JointEdge from './dynamics/joints/joint-edge';
import { Create } from './dynamics/joints/joint-factory';
import Joint from './dynamics/joints/joint';
import LineJointDef from './dynamics/joints/line-joint-def';
import LineJoint from './dynamics/joints/line-joint';
import MouseJointDef from './dynamics/joints/mouse-joint-def';
import MouseJoint from './dynamics/joints/mouse-joint';
import PrismaticJointDef from './dynamics/joints/prismatic-joint-def';
import PrismaticJoint from './dynamics/joints/prismatic-joint';
import PulleyJointDef from './dynamics/joints/pulley-joint-def';
import PulleyJoint from './dynamics/joints/pulley-joint';
import RevoluteJointDef from './dynamics/joints/revolute-joint-def';
import RevoluteJoint from './dynamics/joints/revolute-joint';
import WeldJointDef from './dynamics/joints/weld-joint-def';
import WeldJoint from './dynamics/joints/weld-joint';

export default {
  Collision: {
    b2AABB: Aabb,
    b2BoundValues: BoundValues,
    b2Bound: Bound,
    ClipVertex,
    b2ContactID: ContactId,
    b2ContactPoint: ContactPoint,
    b2DistanceInput: DistanceInput,
    b2DistanceOutput: DistanceOutput,
    b2DistanceProxy: DistanceProxy,
    b2Distance: Distance,
    b2DynamicTreeBroadPhase: DynamicTreeBroadPhase,
    b2DynamicTreeNode: DynamicTreeNode,
    b2DynamicTreePair: DynamicTreePair,
    b2DynamicTree: DynamicTree,
    Features,
    b2Collision: Collision,
    b2ManifoldPoint: ManifoldPoint,
    b2Manifold: Manifold,
    b2Point: Point,
    b2RayCastInput: RayCastInput,
    b2RayCastOutput: RayCastOutput,
    b2Segment: Segment,
    b2SeparationFunction: SeparationFunction,
    b2SimplexCache: SimplexCache,
    b2SimplexVertex: SimplexVertex,
    b2Simplex: Simplex,
    b2TimeOfImpact: TimeOfImpact,
    b2TOIInput: ToiInput,
    b2WorldManifold: WorldManifold,

    Shapes: {
      b2CircleShape: CircleShape,
      b2EdgeChainDef: EdgeChainDef,
      b2EdgeShape: EdgeShape,
      b2MassData: MassData,
      b2PolygonShape: PolygonShape,
      b2Shape: Shape,
    },
  },

  Common: {
    b2Color: Color,
    b2Settings: Settings,

    Math: {
      b2Math: Maths,
      b2Mat22: Mat22,
      b2Mat33: Mat33,
      b2Sweep: Sweep,
      b2Transform: Transform,
      b2Vec2: Vec2,
      b2Vec3: Vec3,
    },
  },

  Dynamics: {
    b2BodyDef: BodyDef,
    b2Body: Body,
    b2ContactFilter: ContactFilter,
    b2ContactImpulse: ContactImpulse,
    b2ContactListener: ContactListener,
    b2ContactManager: ContactManager,
    b2DebugDraw: DebugDraw,
    b2DestructionListener: DestructionListener,
    b2FilterData: FilterData,
    b2FixtureDef: FixtureDef,
    b2Fixture: Fixture,
    b2Island: Island,
    b2TimeStep: TimeStep,
    b2World: World,

    Contacts: {
      b2CircleContact: CircleContact,
      b2ContactConstraintPoint: ContactConstraintPoint,
      b2ContactConstraint: ContactConstraint,
      b2ContactEdge: ContactEdge,
      b2ContactFactory: ContactFactory,
      b2ContactRegister: ContactRegister,
      b2ContactResult: ContactResult,
      b2ContactSolver: ContactSolver,
      b2Contact: Contact,
      b2EdgeAndCircleContact: EdgeAndCircleContact,
      b2NullContact: NullContact,
      b2PolyAndCircleContact: PolyAndCircleContact,
      b2PolyAndEdgeContact: PolyAndEdgeContact,
      b2PolygonContact: PolygonContact,
      b2PositionSolverManifold: PositionSolverManifold,
    },

    Controllers: {
      b2BuoyancyController: BuoyancyController,
      b2ConstantAccelController: ConstantAccelController,
      b2ConstantForceController: ConstantForceController,
      b2ControllerEdge: ControllerEdge,
      b2Controller: Controller,
      b2GravityController: GravityController,
      b2TensorDampingController: TensorDampingController,
    },

    Joints: {
      b2DistanceJointDef: DistanceJointDef,
      b2DistanceJoint: DistanceJoint,
      b2FrictionJointDef: FrictionJointDef,
      b2FrictionJoint: FrictionJoint,
      b2GearJointDef: GearJointDef,
      b2GearJoint: GearJoint,
      b2Jacobian: Jacobian,
      b2JointDef: JointDef,
      b2JointEdge: JointEdge,
      b2Joint: {
        ...Joint,
        Create,
      },
      b2LineJointDef: LineJointDef,
      b2LineJoint: LineJoint,
      b2MouseJointDef: MouseJointDef,
      b2MouseJoint: MouseJoint,
      b2PrismaticJointDef: PrismaticJointDef,
      b2PrismaticJoint: PrismaticJoint,
      b2PulleyJointDef: PulleyJointDef,
      b2PulleyJoint: PulleyJoint,
      b2RevoluteJointDef: RevoluteJointDef,
      b2RevoluteJoint: RevoluteJoint,
      b2WeldJointDef: WeldJointDef,
      b2WeldJoint: WeldJoint,
    },
  },
};

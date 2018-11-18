// tslint:disable variable-name

import ContactFilter from './contact-filter';
import ContactListener from './contact-listener';
import DynamicTreeBroadPhase from '../collision/dynamic-tree-broad-phase';
import World from './world';
import ContactPoint from '../collision/contact-point';
import Fixture from './fixture';
import ContactFactory from './contacts/contact-factory';
import Contact from './contacts/contact';

export default class ContactManager {
  public static s_evalCP = new ContactPoint();

  public m_world?: World;
  public m_contactList?: Contact;
  public m_contactCount = 0;
  public m_contactFilter = ContactFilter.b2_defaultFilter;
  public m_contactListener = ContactListener.b2_defaultListener;
  public m_contactFactory = new ContactFactory(undefined);
  public m_broadPhase = new DynamicTreeBroadPhase();

  public AddPair(fixtureA: Fixture, fixtureB: Fixture) {
    let bodyA = fixtureA.GetBody();
    let bodyB = fixtureB.GetBody();

    if (!this.m_world || !bodyA || !bodyB || bodyA === bodyB) {
      return;
    }

    let edge = bodyB.GetContactList();
    while (edge) {
      if (edge.other === bodyA) {
        const fA = edge.contact.GetFixtureA();
        const fB = edge.contact.GetFixtureB();

        if (fA === fixtureA && fB === fixtureB) {
          return;
        }

        if (fA === fixtureB && fB === fixtureA) {
          return;
        }
      }

      edge = edge.next;
    }

    if (bodyB.ShouldCollide(bodyA) === false) {
      return;
    }

    if (this.m_contactFilter.ShouldCollide(fixtureA, fixtureB) === false) {
      return;
    }

    const c = this.m_contactFactory.Create(fixtureA, fixtureB) as Contact;
    fixtureA = c.GetFixtureA() as Fixture;
    fixtureB = c.GetFixtureB() as Fixture;

    bodyA = fixtureA.m_body;
    bodyB = fixtureB.m_body;

    if (!bodyA || !bodyB) {
      return;
    }

    c.m_prev = undefined;
    c.m_next = this.m_world.m_contactList;

    if (this.m_world.m_contactList != null) {
      this.m_world.m_contactList.m_prev = c;
    }

    this.m_world.m_contactList = c;

    c.m_nodeA.contact = c;
    c.m_nodeA.other = bodyB;
    c.m_nodeA.prev = undefined;
    c.m_nodeA.next = bodyA.m_contactList;

    if (bodyA.m_contactList != null) {
      bodyA.m_contactList.prev = c.m_nodeA;
    }

    bodyA.m_contactList = c.m_nodeA;

    c.m_nodeB.contact = c;
    c.m_nodeB.other = bodyA;
    c.m_nodeB.prev = undefined;
    c.m_nodeB.next = bodyB.m_contactList;

    if (bodyB.m_contactList != null) {
      bodyB.m_contactList.prev = c.m_nodeB;
    }

    bodyB.m_contactList = c.m_nodeB;
    ++this.m_world.m_contactCount;
    return;
  }

  public FindNewContacts() {
    this.m_broadPhase.UpdatePairs((fixtureA: Fixture, fixtureB: Fixture) => {
      this.AddPair(fixtureA, fixtureB);
    });
  }

  public Destroy(c: any) {
    if (!this.m_world) {
      return;
    }

    const fixtureA = c.GetFixtureA();
    const fixtureB = c.GetFixtureB();

    const bodyA = fixtureA.GetBody();
    const bodyB = fixtureB.GetBody();

    if (c.IsTouching()) {
      this.m_contactListener.EndContact(c);
    }

    if (c.m_prev) {
      c.m_prev.m_next = c.m_next;
    }

    if (c.m_next) {
      c.m_next.m_prev = c.m_prev;
    }

    if (c === this.m_world.m_contactList) {
      this.m_world.m_contactList = c.m_next;
    }

    if (c.m_nodeA.prev) {
      c.m_nodeA.prev.next = c.m_nodeA.next;
    }

    if (c.m_nodeA.next) {
      c.m_nodeA.next.prev = c.m_nodeA.prev;
    }

    if (c.m_nodeA === bodyA.m_contactList) {
      bodyA.m_contactList = c.m_nodeA.next;
    }

    if (c.m_nodeB.prev) {
      c.m_nodeB.prev.next = c.m_nodeB.next;
    }

    if (c.m_nodeB.next) {
      c.m_nodeB.next.prev = c.m_nodeB.prev;
    }

    if (c.m_nodeB === bodyB.m_contactList) {
      bodyB.m_contactList = c.m_nodeB.next;
    }

    this.m_contactFactory.Destroy(c);
    --this.m_contactCount;
  }

  public Collide() {
    if (!this.m_world) {
      return;
    }

    let c = this.m_world.m_contactList;
    while (c) {
      const fixtureA = c.GetFixtureA();
      const fixtureB = c.GetFixtureB();

      if (!(fixtureA && fixtureB)) {
        return;
      }

      const bodyA = fixtureA.GetBody();
      const bodyB = fixtureB.GetBody();

      if (!(bodyA && bodyB)) {
        return;
      }

      if (bodyA.IsAwake() === false && bodyB.IsAwake() === false) {
        c = c.GetNext();
        continue;
      }

      if (c.m_flags & Contact.e_filterFlag) {
        if (bodyB.ShouldCollide(bodyA) === false) {
          const cNuke = c;
          c = cNuke.GetNext();
          this.Destroy(cNuke);
          continue;
        }

        if (this.m_contactFilter.ShouldCollide(fixtureA, fixtureB) === false) {
          const cNuke = c;
          c = cNuke.GetNext();
          this.Destroy(cNuke);
          continue;
        }

        c.m_flags &= ~Contact.e_filterFlag;
      }

      const proxyA = fixtureA.m_proxy;
      const proxyB = fixtureB.m_proxy;
      const overlap = this.m_broadPhase.TestOverlap(proxyA, proxyB);

      if (overlap === false) {
        const cNuke = c;
        c = cNuke.GetNext();
        this.Destroy(cNuke);
        continue;
      }

      c.Update(this.m_contactListener);
      c = c.GetNext();
    }
  }
}

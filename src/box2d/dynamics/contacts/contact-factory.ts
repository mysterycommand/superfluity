// tslint:disable variable-name

import Shape from '../../collision/shapes/shape';
import Fixture from '../fixture';
import ContactRegister from './contact-register';
import CircleContact from './circle-contact';
import Contact from './contact';
import PolyAndCircleContact from './poly-and-circle-contact';
import PolygonContact from './polygon-contact';
import EdgeAndCircleContact from './edge-and-circle-contact';
import PolyAndEdgeContact from './poly-and-edge-contact';

export default class ContactFactory {
  public m_registers: Record<number, Record<number, ContactRegister>> = {};

  constructor(public m_allocator: any) {
    this.InitializeRegisters();
  }

  public AddType(
    createFn: (allocator: any) => Contact,
    destroyFn: (contact: Contact, allocator: any) => void,
    type1 = 0,
    type2 = 0,
  ) {
    this.m_registers[type1][type2].createFn = createFn;
    this.m_registers[type1][type2].destroyFn = destroyFn;
    this.m_registers[type1][type2].primary = true;

    if (type1 !== type2) {
      this.m_registers[type2][type1].createFn = createFn;
      this.m_registers[type2][type1].destroyFn = destroyFn;
      this.m_registers[type2][type1].primary = false;
    }
  }

  public InitializeRegisters() {
    this.m_registers = new Array(Shape.e_shapeTypeCount);

    for (let i = 0; i < Shape.e_shapeTypeCount; i++) {
      this.m_registers[i] = new Array(Shape.e_shapeTypeCount);

      for (let j = 0; j < Shape.e_shapeTypeCount; j++) {
        this.m_registers[i][j] = new ContactRegister();
      }
    }

    this.AddType(
      CircleContact.Create,
      CircleContact.Destroy,
      Shape.e_circleShape,
      Shape.e_circleShape,
    );

    this.AddType(
      PolyAndCircleContact.Create,
      PolyAndCircleContact.Destroy,
      Shape.e_polygonShape,
      Shape.e_circleShape,
    );

    this.AddType(
      PolygonContact.Create,
      PolygonContact.Destroy,
      Shape.e_polygonShape,
      Shape.e_polygonShape,
    );

    this.AddType(
      EdgeAndCircleContact.Create,
      EdgeAndCircleContact.Destroy,
      Shape.e_edgeShape,
      Shape.e_circleShape,
    );

    this.AddType(
      PolyAndEdgeContact.Create,
      PolyAndEdgeContact.Destroy,
      Shape.e_polygonShape,
      Shape.e_edgeShape,
    );
  }

  public Create(fixtureA: Fixture, fixtureB: Fixture) {
    const type1 = parseInt(`${fixtureA.GetType()}`, 10);
    const type2 = parseInt(`${fixtureB.GetType()}`, 10);
    const reg = this.m_registers[type1][type2];

    let c;
    if (reg.pool) {
      c = reg.pool;
      reg.pool = c.m_next;
      reg.poolCount--;
      c.Reset(fixtureA, fixtureB);
      return c;
    }

    const createFn = reg.createFn;
    if (!createFn) {
      return;
    }

    if (reg.primary) {
      c = createFn(this.m_allocator);
      c.Reset(fixtureA, fixtureB);

      return c;
    } else {
      c = createFn(this.m_allocator);
      c.Reset(fixtureB, fixtureA);

      return c;
    }
  }

  public Destroy(contact: Contact) {
    if (
      !(
        contact.m_fixtureA &&
        contact.m_fixtureB &&
        contact.m_fixtureA.m_body &&
        contact.m_fixtureB.m_body
      )
    ) {
      return;
    }

    if (contact.m_manifold.m_pointCount > 0) {
      contact.m_fixtureA.m_body.SetAwake(true);
      contact.m_fixtureB.m_body.SetAwake(true);
    }

    const type1 = parseInt(`${contact.m_fixtureA.GetType()}`, 10);
    const type2 = parseInt(`${contact.m_fixtureB.GetType()}`, 10);
    const reg = this.m_registers[type1][type2];

    if (true) {
      reg.poolCount++;
      contact.m_next = reg.pool;
      reg.pool = contact;
    }

    const destroyFn = reg.destroyFn;
    if (!destroyFn) {
      return;
    }

    destroyFn(contact, this.m_allocator);
  }
}

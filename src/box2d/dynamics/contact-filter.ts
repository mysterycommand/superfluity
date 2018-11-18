// tslint:disable variable-name

import Fixture from './fixture';

export default class ContactFilter {
  public static b2_defaultFilter = new ContactFilter();

  public ShouldCollide(fixtureA: Fixture, fixtureB: Fixture) {
    const filter1 = fixtureA.GetFilterData();
    const filter2 = fixtureB.GetFilterData();

    if (filter1.groupIndex === filter2.groupIndex && filter1.groupIndex !== 0) {
      return filter1.groupIndex > 0;
    }

    return (
      (filter1.maskBits & filter2.categoryBits) !== 0 &&
      (filter1.categoryBits & filter2.maskBits) !== 0
    );
  }

  public RayCollide(userData: any, fixture: Fixture) {
    if (userData instanceof Fixture) {
      return this.ShouldCollide(userData, fixture);
    }

    return true;
  }
}

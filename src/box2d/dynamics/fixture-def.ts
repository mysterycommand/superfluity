import FilterData from './filter-data';

export default class FixtureDef {
  public filter = new FilterData();

  public shape: any = undefined;
  public userData: any = undefined;
  public friction = 0.2;
  public restitution = 0.0;
  public density = 0.0;
  public isSensor = false;

  constructor() {
    this.filter.categoryBits = 0x0001;
    this.filter.maskBits = 0xffff;
    this.filter.groupIndex = 0;
  }
}

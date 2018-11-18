export default class FilterData {
  public categoryBits = 0x0001;
  public maskBits = 0xffff;
  public groupIndex = 0;

  public Copy() {
    const copy = new FilterData();
    copy.categoryBits = this.categoryBits;
    copy.maskBits = this.maskBits;
    copy.groupIndex = this.groupIndex;
    return copy;
  }
}

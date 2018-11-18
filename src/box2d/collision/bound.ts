export default class Bound {
  public value = 0;
  public proxy = 0;
  public stabbingCount = 0;

  public IsLower() {
    return (this.value & 1) === 0;
  }

  public IsUpper() {
    return (this.value & 1) === 1;
  }

  public Swap(b: Bound) {
    const tempValue = this.value;
    const tempProxy = this.proxy;
    const tempStabbingCount = this.stabbingCount;

    this.value = b.value;
    this.proxy = b.proxy;
    this.stabbingCount = b.stabbingCount;

    b.value = tempValue;
    b.proxy = tempProxy;
    b.stabbingCount = tempStabbingCount;
  }
}

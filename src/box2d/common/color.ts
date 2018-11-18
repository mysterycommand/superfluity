import { Clamp, parseUInt } from './math';

export default class Color {
  private _r = 0;
  public get r() {
    return this._r;
  }
  public set r(val: number) {
    this._r = parseUInt(255 * Clamp(val, 0.0, 1.0));
  }

  private _g = 0;
  public get g() {
    return this._g;
  }
  public set g(val: number) {
    this._g = parseUInt(255 * Clamp(val, 0.0, 1.0));
  }

  private _b = 0;
  public get b() {
    return this._b;
  }
  public set b(val: number) {
    this._b = parseUInt(255 * Clamp(val, 0.0, 1.0));
  }

  public get color() {
    return (this._r << 16) | (this._g << 8) | this._b;
  }

  constructor(r = 0, g = 0, b = 0) {
    this.Set(r, g, b);
  }

  public Set(r = 0, g = 0, b = 0) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
}

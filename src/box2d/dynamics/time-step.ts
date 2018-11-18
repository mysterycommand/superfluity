// tslint:disable variable-name

export default class TimeStep {
  public dt = 1 / 60;
  public inv_dt = 1 / this.dt;

  public positionIterations = 10;
  public velocityIterations = 10;

  public dtRatio = 1;
  public warmStarting = true;

  public Set({
    dt,
    inv_dt,
    positionIterations,
    velocityIterations,
    warmStarting,
  }: TimeStep) {
    this.dt = dt;
    this.inv_dt = inv_dt;
    this.positionIterations = positionIterations;
    this.velocityIterations = velocityIterations;
    this.warmStarting = warmStarting;
  }
}

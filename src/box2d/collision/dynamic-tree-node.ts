import Aabb from './aabb';

export default class DynamicTreeNode {
  public aabb = new Aabb();
  public child1?: any;
  public child2?: any;
  public parent?: any;

  public IsLeaf() {
    return this.child1 == null;
  }
}

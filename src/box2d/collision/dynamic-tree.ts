// tslint:disable variable-name

import Aabb from './aabb';
import {
  b2Assert,
  b2_aabbExtension,
  b2_aabbMultiplier,
} from '../common/settings';
import { AbsV, CrossFV, SubtractVV } from '../common/math';
import Vec2 from '../common/math/vec2';
import DynamicTreeNode from './dynamic-tree-node';
import RayCastInput from './ray-cast-input';

export default class DynamicTree {
  public m_root?: any = null;
  public m_freeList?: any = null;
  public m_path = 0;
  public m_insertionCount = 0;

  public CreateProxy(aabb: Aabb, userData: any) {
    const node = this.AllocateNode();
    const extendX = b2_aabbExtension;
    const extendY = b2_aabbExtension;

    node.aabb.lowerBound.x = aabb.lowerBound.x - extendX;
    node.aabb.lowerBound.y = aabb.lowerBound.y - extendY;
    node.aabb.upperBound.x = aabb.upperBound.x + extendX;
    node.aabb.upperBound.y = aabb.upperBound.y + extendY;

    node.userData = userData;
    this.InsertLeaf(node);
    return node;
  }

  public DestroyProxy(proxy: any) {
    this.RemoveLeaf(proxy);
    this.FreeNode(proxy);
  }

  public MoveProxy(proxy: any, aabb: Aabb, displacement: Vec2) {
    b2Assert(proxy.IsLeaf());

    if (proxy.aabb.Contains(aabb)) {
      return false;
    }

    this.RemoveLeaf(proxy);

    const extendX =
      b2_aabbExtension +
      b2_aabbMultiplier *
        (displacement.x > 0 ? displacement.x : -displacement.x);

    const extendY =
      b2_aabbExtension +
      b2_aabbMultiplier *
        (displacement.y > 0 ? displacement.y : -displacement.y);

    proxy.aabb.lowerBound.x = aabb.lowerBound.x - extendX;
    proxy.aabb.lowerBound.y = aabb.lowerBound.y - extendY;
    proxy.aabb.upperBound.x = aabb.upperBound.x + extendX;
    proxy.aabb.upperBound.y = aabb.upperBound.y + extendY;

    this.InsertLeaf(proxy);
    return true;
  }

  public Rebalance(iterations = 0) {
    if (!this.m_root) {
      return;
    }

    for (let i = 0; i < iterations; i++) {
      let node = this.m_root;
      let bit = 0;

      while (!node.IsLeaf()) {
        node = (this.m_path >> bit) & 1 ? node.child2 : node.child1;
        bit = (bit + 1) & 31;
      }

      ++this.m_path;
      this.RemoveLeaf(node);
      this.InsertLeaf(node);
    }
  }

  public GetFatAABB(proxy: any) {
    return proxy.aabb;
  }

  public GetUserData(proxy: any) {
    return proxy.userData;
  }

  public Query(cb: (...args: any[]) => boolean, aabb: Aabb) {
    if (!this.m_root) {
      return;
    }

    const stack: DynamicTreeNode[] = [];
    let count = 0;
    stack[count++] = this.m_root;

    while (count > 0) {
      const node = stack[--count];
      if (node.aabb.TestOverlap(aabb)) {
        if (node.IsLeaf()) {
          const proceed = cb(node);

          if (!proceed) {
            return;
          }
        } else {
          stack[count++] = node.child1;
          stack[count++] = node.child2;
        }
      }
    }
  }

  public RayCast(cb: (...args: any[]) => number, input: RayCastInput) {
    if (!this.m_root) {
      return;
    }

    const p1 = input.p1;
    const p2 = input.p2;

    const r = SubtractVV(p1, p2);
    r.Normalize();

    const v = CrossFV(1.0, r);
    const abs_v = AbsV(v);
    let maxFraction = input.maxFraction;
    const segmentAABB = new Aabb();

    let tX = 0;
    let tY = 0;
    {
      tX = p1.x + maxFraction * (p2.x - p1.x);
      tY = p1.y + maxFraction * (p2.y - p1.y);

      segmentAABB.lowerBound.x = Math.min(p1.x, tX);
      segmentAABB.lowerBound.y = Math.min(p1.y, tY);
      segmentAABB.upperBound.x = Math.max(p1.x, tX);
      segmentAABB.upperBound.y = Math.max(p1.y, tY);
    }

    const stack: DynamicTreeNode[] = [];
    let count = 0;
    stack[count++] = this.m_root;

    while (count > 0) {
      const node = stack[--count];

      if (node.aabb.TestOverlap(segmentAABB) === false) {
        continue;
      }

      const c = node.aabb.GetCenter();
      const h = node.aabb.GetExtents();

      const separation =
        Math.abs(v.x * (p1.x - c.x) + v.y * (p1.y - c.y)) -
        abs_v.x * h.x -
        abs_v.y * h.y;

      if (separation > 0.0) {
        continue;
      }

      if (node.IsLeaf()) {
        const subInput = new RayCastInput();

        subInput.p1 = input.p1;
        subInput.p2 = input.p2;
        subInput.maxFraction = input.maxFraction;
        maxFraction = cb(subInput, node);

        if (maxFraction === 0) {
          return;
        }

        if (maxFraction > 0) {
          tX = p1.x + maxFraction * (p2.x - p1.x);
          tY = p1.y + maxFraction * (p2.y - p1.y);

          segmentAABB.lowerBound.x = Math.min(p1.x, tX);
          segmentAABB.lowerBound.y = Math.min(p1.y, tY);
          segmentAABB.upperBound.x = Math.max(p1.x, tX);
          segmentAABB.upperBound.y = Math.max(p1.y, tY);
        }
      } else {
        stack[count++] = node.child1;
        stack[count++] = node.child2;
      }
    }
  }

  public AllocateNode() {
    if (this.m_freeList) {
      const node = this.m_freeList;
      this.m_freeList = node.parent;

      node.parent = null;
      node.child1 = null;
      node.child2 = null;

      return node;
    }

    return new DynamicTreeNode();
  }

  public FreeNode(node: DynamicTreeNode) {
    node.parent = this.m_freeList;
    this.m_freeList = node;
  }

  public InsertLeaf(leaf: DynamicTreeNode) {
    ++this.m_insertionCount;

    if (this.m_root == null) {
      this.m_root = leaf;
      this.m_root.parent = null;
      return;
    }

    const center = leaf.aabb.GetCenter();
    let sibling = this.m_root;

    if (sibling.IsLeaf() === false) {
      do {
        const child1 = sibling.child1;
        const child2 = sibling.child2;

        const norm1 =
          Math.abs(
            (child1.aabb.lowerBound.x + child1.aabb.upperBound.x) / 2 -
              center.x,
          ) +
          Math.abs(
            (child1.aabb.lowerBound.y + child1.aabb.upperBound.y) / 2 -
              center.y,
          );

        const norm2 =
          Math.abs(
            (child2.aabb.lowerBound.x + child2.aabb.upperBound.x) / 2 -
              center.x,
          ) +
          Math.abs(
            (child2.aabb.lowerBound.y + child2.aabb.upperBound.y) / 2 -
              center.y,
          );

        if (norm1 < norm2) {
          sibling = child1;
        } else {
          sibling = child2;
        }
      } while (!sibling.IsLeaf());
    }

    let node1 = sibling.parent;
    let node2 = this.AllocateNode();

    node2.parent = node1;
    node2.userData = null;
    node2.aabb.Combine(leaf.aabb, sibling.aabb);

    if (node1) {
      if (sibling.parent.child1 === sibling) {
        node1.child1 = node2;
      } else {
        node1.child2 = node2;
      }

      node2.child1 = sibling;
      node2.child2 = leaf;
      sibling.parent = node2;
      leaf.parent = node2;

      do {
        if (node1.aabb.Contains(node2.aabb)) {
          break;
        }

        node1.aabb.Combine(node1.child1.aabb, node1.child2.aabb);
        node2 = node1;
        node1 = node1.parent;
      } while (node1);
    } else {
      node2.child1 = sibling;
      node2.child2 = leaf;
      sibling.parent = node2;
      leaf.parent = node2;
      this.m_root = node2;
    }
  }

  public RemoveLeaf(leaf: DynamicTreeNode) {
    if (leaf === this.m_root) {
      this.m_root = null;
      return;
    }

    const node2 = leaf.parent;
    let node1 = node2.parent;
    let sibling;

    if (node2.child1 === leaf) {
      sibling = node2.child2;
    } else {
      sibling = node2.child1;
    }

    if (node1) {
      if (node1.child1 === node2) {
        node1.child1 = sibling;
      } else {
        node1.child2 = sibling;
      }

      sibling.parent = node1;

      this.FreeNode(node2);

      while (node1) {
        const oldAABB = node1.aabb;
        node1.aabb = Aabb.Combine(node1.child1.aabb, node1.child2.aabb);

        if (oldAABB.Contains(node1.aabb)) {
          break;
        }

        node1 = node1.parent;
      }
    } else {
      this.m_root = sibling;
      sibling.parent = null;
      this.FreeNode(node2);
    }
  }
}

// tslint:disable variable-name

import Aabb from './aabb';
import DynamicTree from './dynamic-tree';
import DynamicTreePair from './dynamic-tree-pair';
import RayCastInput from './ray-cast-input';

export default class DynamicTreeBroadPhase {
  public m_tree = new DynamicTree();
  public m_moveBuffer: any[] = [];
  public m_pairBuffer: any[] = [];
  public m_pairCount = 0;
  public m_proxyCount = 0;

  public CreateProxy(aabb: Aabb, userData: any) {
    const proxy = this.m_tree.CreateProxy(aabb, userData);
    ++this.m_proxyCount;

    this.BufferMove(proxy);
    return proxy;
  }

  public DestroyProxy(proxy: any) {
    this.UnBufferMove(proxy);
    --this.m_proxyCount;
    this.m_tree.DestroyProxy(proxy);
  }

  public MoveProxy(proxy: any, aabb: Aabb, displacement: any) {
    const buffer = this.m_tree.MoveProxy(proxy, aabb, displacement);
    if (buffer) {
      this.BufferMove(proxy);
    }
  }

  public TestOverlap(proxyA: any, proxyB: any) {
    const aabbA = this.m_tree.GetFatAABB(proxyA);
    const aabbB = this.m_tree.GetFatAABB(proxyB);
    return aabbA.TestOverlap(aabbB);
  }

  public GetUserData(proxy: any) {
    return this.m_tree.GetUserData(proxy);
  }

  public GetFatAABB(proxy: any) {
    return this.m_tree.GetFatAABB(proxy);
  }

  public GetProxyCount() {
    return this.m_proxyCount;
  }

  public UpdatePairs(cb: (...args: any[]) => void) {
    this.m_pairCount = 0;

    for (const queryProxy of this.m_moveBuffer) {
      const fatAABB = this.m_tree.GetFatAABB(queryProxy);
      this.m_tree.Query((proxy: any) => {
        if (proxy === queryProxy) {
          return true;
        }

        if (this.m_pairCount === this.m_pairBuffer.length) {
          this.m_pairBuffer[this.m_pairCount] = new DynamicTreePair();
        }

        const pair = this.m_pairBuffer[this.m_pairCount];

        pair.proxyA = proxy < queryProxy ? proxy : queryProxy;
        pair.proxyB = proxy >= queryProxy ? proxy : queryProxy;

        ++this.m_pairCount;
        return true;
      }, fatAABB);
    }

    this.m_moveBuffer.length = 0;

    for (let i = 0; i < this.m_pairCount; ) {
      const primaryPair = this.m_pairBuffer[i];

      const userDataA = this.m_tree.GetUserData(primaryPair.proxyA);
      const userDataB = this.m_tree.GetUserData(primaryPair.proxyB);

      cb(userDataA, userDataB);

      ++i;
      while (i < this.m_pairCount) {
        const pair = this.m_pairBuffer[i];

        if (
          pair.proxyA !== primaryPair.proxyA ||
          pair.proxyB !== primaryPair.proxyB
        ) {
          break;
        }

        ++i;
      }
    }
  }

  public Query(cb: (...args: any[]) => boolean, aabb: Aabb) {
    this.m_tree.Query(cb, aabb);
  }

  public RayCast(cb: (...args: any[]) => number, input: RayCastInput) {
    this.m_tree.RayCast(cb, input);
  }

  public Validate() {} // tslint:disable-line no-empty

  public Rebalance(iterations = 0) {
    this.m_tree.Rebalance(iterations);
  }

  public BufferMove(proxy: any) {
    this.m_moveBuffer[this.m_moveBuffer.length] = proxy;
  }

  public UnBufferMove(proxy: any) {
    const i = parseInt(`${this.m_moveBuffer.indexOf(proxy)}`, 10);
    this.m_moveBuffer.splice(i, 1);
  }

  public ComparePairs(pair1: DynamicTreePair, pair2: DynamicTreePair) {
    return 0;
  }
}

// b2DynamicTreeBroadPhase.__implements = {};
// b2DynamicTreeBroadPhase.__implements[IBroadPhase] = true;

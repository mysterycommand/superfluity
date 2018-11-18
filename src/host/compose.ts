/**
 * @see: https://github.com/mrdoob/three.js/blob/dev/src/math/Matrix4.js#L291
 * @see: https://github.com/mrdoob/three.js/blob/dev/src/math/Matrix4.js#L741
 */
export default function compose([x, y, z, w]: number[]) {
  const position = {
    x: 0,
    y: 0,
    z: 0,
  };

  const scale = {
    x: 1,
    y: 1,
    z: 1,
  };

  const te = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;

  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;

  const yy = y * y2;
  const yz = y * z2;

  const zz = z * z2;

  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;

  const sx = scale.x;
  const sy = scale.y;
  const sz = scale.z;

  te[0] = (1 - (yy + zz)) * sx;
  te[1] = (xy + wz) * sx;
  te[2] = (xz - wy) * sx;
  te[3] = 0;

  te[4] = (xy - wz) * sy;
  te[5] = (1 - (xx + zz)) * sy;
  te[6] = (yz + wx) * sy;
  te[7] = 0;

  te[8] = (xz + wy) * sz;
  te[9] = (yz - wx) * sz;
  te[10] = (1 - (xx + yy)) * sz;
  te[11] = 0;

  te[12] = position.x;
  te[13] = position.y;
  te[14] = position.z;
  te[15] = 1;

  return te;
}

/**
 * @see: https://github.com/mrdoob/three.js/blob/dev/src/math/Matrix4.js#L291
 * @see: https://github.com/mrdoob/three.js/blob/dev/src/math/Matrix4.js#L741
 */
export default function compose([x, y, z, w]: number[]) {
  // prettier-ignore
  const te = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];

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

  te[0] = 1 - (yy + zz);
  te[1] = xy + wz;
  te[2] = xz - wy;

  te[4] = xy - wz;
  te[5] = 1 - (xx + zz);
  te[6] = yz + wx;

  te[8] = xz + wy;
  te[9] = yz - wx;
  te[10] = 1 - (xx + yy);

  return te;
}

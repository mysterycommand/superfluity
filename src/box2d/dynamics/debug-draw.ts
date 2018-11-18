// tslint:disable variable-name no-bitwise
import Color from '../common/color';

export default class DebugDraw {
  public static e_shapeBit = 0x0001;
  public static e_jointBit = 0x0002;
  public static e_aabbBit = 0x0004;
  public static e_pairBit = 0x0008;
  public static e_centerOfMassBit = 0x0010;
  public static e_controllerBit = 0x0020;

  public m_drawScale = 1.0;
  public m_lineThickness = 1.0;
  public m_alpha = 1.0;
  public m_fillAlpha = 1.0;
  public m_xformScale = 1.0;
  public m_ctx: CanvasRenderingContext2D | undefined;
  public m_sprite = {
    graphics: {
      clear: () => {
        if (!this.m_ctx) {
          return;
        }

        const {
          canvas: { width: w, height: h },
        } = this.m_ctx;
        this.m_ctx.clearRect(0, 0, w, h);
      },
    },
  };
  public m_drawFlags = 0;

  public _color(rgb: number, a: number) {
    return `rgba(${(rgb & 0xff0000) >> 16},${(rgb & 0xff00) >> 8},${rgb &
      0xff},${a})`;
  }

  public SetFlags(flags = 0) {
    this.m_drawFlags = flags;
  }

  public GetFlags() {
    return this.m_drawFlags;
  }

  public AppendFlags(flags = 0) {
    this.m_drawFlags |= flags;
  }

  public ClearFlags(flags = 0) {
    this.m_drawFlags &= ~flags;
  }

  public SetSprite(sprite: CanvasRenderingContext2D) {
    this.m_ctx = sprite;
  }

  public GetSprite() {
    return this.m_ctx;
  }

  public SetDrawScale(drawScale = 0) {
    this.m_drawScale = drawScale;
  }

  public GetDrawScale() {
    return this.m_drawScale;
  }

  public SetLineThickness(lineThickness = 0) {
    this.m_lineThickness = lineThickness;

    if (!this.m_ctx) {
      return;
    }
    this.m_ctx.lineWidth = lineThickness;
  }

  public GetLineThickness() {
    return this.m_lineThickness;
  }

  public SetAlpha(alpha = 0) {
    this.m_alpha = alpha;
  }

  public GetAlpha() {
    return this.m_alpha;
  }

  public SetFillAlpha(alpha = 0) {
    this.m_fillAlpha = alpha;
  }

  public GetFillAlpha() {
    return this.m_fillAlpha;
  }

  public SetXFormScale(xformScale = 0) {
    this.m_xformScale = xformScale;
  }

  public GetXFormScale() {
    return this.m_xformScale;
  }

  public DrawPolygon(
    vertices: Array<{ x: number; y: number }>,
    vertexCount = 0,
    color: Color,
  ) {
    if (!(this.m_ctx && vertexCount)) {
      return;
    }

    const s = this.m_ctx;
    const drawScale = this.m_drawScale;

    s.beginPath();
    s.strokeStyle = this._color(color.color, this.m_alpha);
    s.moveTo(vertices[0].x * drawScale, vertices[0].y * drawScale);
    for (let i = 1; i < vertexCount; i++) {
      s.lineTo(vertices[i].x * drawScale, vertices[i].y * drawScale);
    }
    s.lineTo(vertices[0].x * drawScale, vertices[0].y * drawScale);
    s.closePath();
    s.stroke();
  }

  public DrawSolidPolygon(
    vertices: Array<{ x: number; y: number }>,
    vertexCount = 0,
    color: Color,
  ) {
    if (!(this.m_ctx && vertexCount)) {
      return;
    }

    const s = this.m_ctx;
    const drawScale = this.m_drawScale;

    s.beginPath();
    s.strokeStyle = this._color(color.color, this.m_alpha);
    s.fillStyle = this._color(color.color, this.m_fillAlpha);
    s.moveTo(vertices[0].x * drawScale, vertices[0].y * drawScale);
    for (let i = 1; i < vertexCount; i++) {
      s.lineTo(vertices[i].x * drawScale, vertices[i].y * drawScale);
    }
    s.lineTo(vertices[0].x * drawScale, vertices[0].y * drawScale);
    s.closePath();
    s.fill();
    s.stroke();
  }

  public DrawCircle(
    center: { x: number; y: number },
    radius = 0,
    color: Color,
  ) {
    if (!(this.m_ctx && radius)) {
      return;
    }

    const s = this.m_ctx;
    const drawScale = this.m_drawScale;
    const cx = center.x * drawScale;
    const cy = center.y * drawScale;

    s.beginPath();
    s.strokeStyle = this._color(color.color, this.m_alpha);
    s.arc(cx, cy, radius * drawScale, 0, Math.PI * 2, true);
    s.closePath();
    s.stroke();
  }

  public DrawSolidCircle(
    center: { x: number; y: number },
    radius = 0,
    axis: { x: number; y: number },
    color: Color,
  ) {
    if (!(this.m_ctx && radius)) {
      return;
    }

    const s = this.m_ctx;
    const drawScale = this.m_drawScale;
    const cx = center.x * drawScale;
    const cy = center.y * drawScale;

    s.moveTo(0, 0);
    s.beginPath();
    s.strokeStyle = this._color(color.color, this.m_alpha);
    s.fillStyle = this._color(color.color, this.m_fillAlpha);
    s.arc(cx, cy, radius * drawScale, 0, Math.PI * 2, true);
    s.moveTo(cx, cy);
    s.lineTo(
      (center.x + axis.x * radius) * drawScale,
      (center.y + axis.y * radius) * drawScale,
    );
    s.closePath();
    s.fill();
    s.stroke();
  }

  public DrawSegment(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    color: Color,
  ) {
    if (!this.m_ctx) {
      return;
    }

    const s = this.m_ctx;
    const drawScale = this.m_drawScale;

    s.strokeStyle = this._color(color.color, this.m_alpha);
    s.beginPath();
    s.moveTo(p1.x * drawScale, p1.y * drawScale);
    s.lineTo(p2.x * drawScale, p2.y * drawScale);
    s.closePath();
    s.stroke();
  }

  public DrawTransform(xf: {
    position: { x: number; y: number };
    R: { col1: { x: number; y: number }; col2: { x: number; y: number } };
  }) {
    if (!this.m_ctx) {
      return;
    }

    const s = this.m_ctx;
    const drawScale = this.m_drawScale;

    s.beginPath();
    s.strokeStyle = this._color(0xff0000, this.m_alpha);
    s.moveTo(xf.position.x * drawScale, xf.position.y * drawScale);
    s.lineTo(
      (xf.position.x + this.m_xformScale * xf.R.col1.x) * drawScale,
      (xf.position.y + this.m_xformScale * xf.R.col1.y) * drawScale,
    );

    s.strokeStyle = this._color(0xff00, this.m_alpha);
    s.moveTo(xf.position.x * drawScale, xf.position.y * drawScale);
    s.lineTo(
      (xf.position.x + this.m_xformScale * xf.R.col2.x) * drawScale,
      (xf.position.y + this.m_xformScale * xf.R.col2.y) * drawScale,
    );
    s.closePath();
    s.stroke();
  }
}

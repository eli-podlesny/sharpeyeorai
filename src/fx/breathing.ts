import { gameConfig, type BreathingPreset } from '../config/game.config';
import { layout } from '../config/layout.config';
import type { BackgroundLayer } from '../layers/background';
import { createTween } from './schedule';

/**
 * Background breathing: a small WebGL shader (no library) pushes the background image
 * around with slow, smooth noise, like looking at it through water. Background layer only.
 *
 * One quad, one draw call per frame, the image uploaded once as a texture, the canvas sized
 * to the layer (the window) at a capped pixel ratio. It draws only while breathing; at rest
 * the plain image shows. No WebGL, or reduced motion: the static image stays.
 */
export type BreathingLevel = 'off' | 'subtle' | 'strong';

export interface BreathingFx {
  /** False without WebGL (or once the context is lost): the static image is all there is. */
  readonly supported: boolean;
  setLevel(level: BreathingLevel, now: number): void;
  /** Call every frame. */
  update(now: number, reducedMotion: boolean): void;
}

const VERTEX = `
attribute vec2 a_pos;
varying vec2 v_pos;
void main() {
  v_pos = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Canvas position → image UV (the image is drawn "cover", centered, like the <img>), then
// pushed by a smooth vector field made of a few slow sines: no hard edges, no sudden moves.
const FRAGMENT = `
precision mediump float;
varying vec2 v_pos;
uniform sampler2D u_image;
uniform vec4 u_rect;     // image rect on the canvas, in 0–1 canvas units: x, y, w, h (y up)
uniform vec2 u_amp;      // displacement amplitude in UV units
uniform float u_phase;   // noise time, in radians
void main() {
  vec2 uv = (v_pos - u_rect.xy) / u_rect.zw;
  uv.y = 1.0 - uv.y;
  vec2 p = uv * vec2(3.2, 2.1);
  float t = u_phase;
  vec2 d = vec2(
    sin(p.y * 1.7 + t) + 0.6 * sin(p.x * 1.3 - t * 0.8 + 1.3) + 0.35 * sin((p.x + p.y) * 2.3 + t * 1.3),
    cos(p.x * 1.5 - t * 0.9) + 0.6 * cos(p.y * 1.9 + t * 0.7 + 2.1) + 0.35 * cos((p.x - p.y) * 2.1 - t * 1.1)
  ) / 1.95;
  gl_FragColor = texture2D(u_image, clamp(uv + d * u_amp, 0.0, 1.0));
}`;

const NONE: BreathingPreset = { amplitudePx: 0, speed: 0 };

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

export function createBreathing(background: BackgroundLayer): BreathingFx {
  const cfg = gameConfig.fx.breathing;
  const { art } = background;
  const canvas = document.createElement('canvas');
  canvas.className = 'background__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  background.el.append(canvas);

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  });

  const amp = createTween(0);
  const speed = createTween(0);
  let supported = false;
  let textureReady = false;
  let phase = 0;
  let lastNow: number | null = null;
  let drawing = false;
  let sizeDirty = true;

  let uRect: WebGLUniformLocation | null = null;
  let uAmp: WebGLUniformLocation | null = null;
  let uPhase: WebGLUniformLocation | null = null;

  if (gl) {
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (vs && fs && program) {
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.useProgram(program);
        const quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
          gl.STATIC_DRAW,
        );
        const aPos = gl.getAttribLocation(program, 'a_pos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        uRect = gl.getUniformLocation(program, 'u_rect');
        uAmp = gl.getUniformLocation(program, 'u_amp');
        uPhase = gl.getUniformLocation(program, 'u_phase');
        supported = true;
      }
    }
    canvas.addEventListener('webglcontextlost', () => {
      supported = false;
      stopDrawing();
    });
  }

  /** Uploads the image once. SVG art is rasterized at its natural (art) size first. */
  const upload = (): void => {
    if (!gl || !supported || textureReady) return;
    const { artWidth, artHeight } = layout.background;
    const raster = document.createElement('canvas');
    raster.width = art.naturalWidth || artWidth;
    raster.height = art.naturalHeight || artHeight;
    const g = raster.getContext('2d');
    if (!g) return;
    g.drawImage(art, 0, 0, raster.width, raster.height);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, raster);
    // Image sizes are not powers of two: no mipmaps, clamped edges.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Draw once now, while the canvas is still hidden: the driver finishes compiling the
    // shader and moving the texture here, at load, not as a stutter when breathing starts.
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish();
    textureReady = true;
  };
  if (art.complete && art.naturalWidth > 0) upload();
  else art.addEventListener('load', upload, { once: true });

  window.addEventListener('resize', () => (sizeDirty = true));

  /** Matches the canvas to the layer, and tells the shader where the image sits on it. */
  const resize = (): void => {
    if (!gl) return;
    const ratio = Math.min(window.devicePixelRatio || 1, cfg.maxPixelRatio);
    const layer = background.el.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(layer.width * ratio));
    canvas.height = Math.max(1, Math.round(layer.height * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    const img = art.getBoundingClientRect();
    const x = (img.left - layer.left) / layer.width;
    const w = img.width / layer.width;
    const h = img.height / layer.height;
    const yTop = (img.top - layer.top) / layer.height;
    gl.uniform4f(uRect, x, 1 - yTop - h, w, h);
    sizeDirty = false;
  };

  const startDrawing = (): void => {
    drawing = true;
    sizeDirty = true;
    canvas.hidden = false;
    art.style.visibility = 'hidden';
  };

  function stopDrawing(): void {
    drawing = false;
    lastNow = null;
    canvas.hidden = true;
    art.style.visibility = '';
  }

  return {
    get supported() {
      return supported;
    },
    setLevel(level, now) {
      const preset = level === 'off' ? NONE : cfg[level];
      amp.setTarget(preset.amplitudePx, now, cfg.transitionMs);
      // Speed eases too; when fading out it keeps moving while the push shrinks.
      if (level !== 'off') speed.setTarget(preset.speed, now, cfg.transitionMs);
    },
    update(now, reducedMotion) {
      const a = amp.value(now);
      if (!gl || !supported || !textureReady || reducedMotion || (a <= 0 && amp.target <= 0)) {
        if (drawing) stopDrawing();
        return;
      }
      if (!drawing) startDrawing();
      if (sizeDirty) resize();
      const dt = lastNow === null ? 0 : Math.min(now - lastNow, 100);
      lastNow = now;
      phase += (dt * speed.value(now) * 2 * Math.PI) / cfg.cycleMs;
      const { artWidth, artHeight } = layout.background;
      gl.uniform2f(uAmp, a / artWidth, a / artHeight);
      gl.uniform1f(uPhase, phase);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}

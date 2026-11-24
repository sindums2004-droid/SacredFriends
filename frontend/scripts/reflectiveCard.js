/**
 * Sacred Friends — React Bits <ReflectiveCard /> Live WebGL2 Engine
 * High-performance WebGL2 shader surface with brushed metal grain,
 * chamfer bevel highlights, cursor-following glare, and smooth 3D tilt physics.
 */

const THEMES = {
  dark: {
    '--rc-base': '#131318',
    '--rc-shadow': '0 24px 50px -18px rgba(0, 0, 0, 0.85), 0 8px 24px -10px rgba(0, 0, 0, 0.6)',
    '--rc-ink': '#f4f4f5',
    '--rc-muted': 'rgba(244, 244, 245, 0.65)',
    '--rc-tile': 'linear-gradient(180deg, #2a2734 0%, #1a1822 100%)',
    '--rc-tile-edge': 'rgba(212, 175, 55, 0.25)',
    '--rc-tile-highlight': 'rgba(255, 255, 255, 0.15)',
    '--rc-tile-shadow': '0 4px 12px -3px rgba(0, 0, 0, 0.8)',
    '--rc-rim': 'rgba(255, 255, 255, 0.08)',
    '--rc-rim-highlight': 'rgba(212, 175, 55, 0.35)'
  }
};

const VIEW_DISTANCE = 900;
const OVERSCAN = 1.2;

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const PLATE_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform vec2 uSize;
uniform float uRadius;
uniform float uScale;
uniform mat3 uRotate;
uniform float uBlur;
uniform float uRough;
uniform float uMetal;
uniform vec3 uTint;
uniform float uShine;
uniform float uBevel;
uniform float uGlare;
uniform vec2 uPointer;
uniform float uTime;

const float VIEW = ${VIEW_DISTANCE.toFixed(1)};
const vec2 SWEEP = vec2(0.5, 0.86);

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

vec3 gradientNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = hash2(i);
  vec2 gb = hash2(i + vec2(1.0, 0.0));
  vec2 gc = hash2(i + vec2(0.0, 1.0));
  vec2 gd = hash2(i + vec2(1.0, 1.0));
  float va = dot(ga, f);
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float k = va - vb - vc + vd;
  float value = va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k;
  vec2 slope = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * k + vec2(vb, vc) - va);
  return vec3(value, slope);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float erf(float x) {
  float x2 = x * x;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2)));
}

float band(float x, float halfWidth, float sigma) {
  float s = 1.4142136 * max(sigma, 0.0001);
  return 0.5 * (erf((x + halfWidth) / s) - erf((x - halfWidth) / s));
}

float strip(vec2 q, vec2 center, vec2 dir, float halfWidth, vec2 sigma) {
  vec2 normal = vec2(-dir.y, dir.x);
  return band(dot(q - center, normal), halfWidth, length(sigma * normal));
}

float softbox(vec2 q, vec2 sigma) {
  float key = strip(q, vec2(-0.1, -0.16), normalize(SWEEP), 0.025, sigma + 0.018);
  float top = band(q.y + 0.6, 0.12, sigma.y + 0.05);
  float side = band(q.x - 0.46, 0.05, sigma.x + 0.05);
  return key + top * 0.8 + side * 0.35;
}

float room(vec2 q, vec2 sigma) {
  float fall = smoothstep(-0.55, 0.5, q.y);
  float flag = strip(q, vec2(0.24, -0.02), normalize(SWEEP), 0.09, sigma + 0.08);
  return mix(0.85, 0.12, fall) * (1.0 - 0.6 * flag);
}

void main() {
  vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uSize;
  vec2 halfSize = uSize * 0.5;
  float r = min(uRadius, min(halfSize.x, halfSize.y));
  vec2 corner = abs(p) - halfSize + r;
  vec2 side = vec2(p.x >= 0.0 ? 1.0 : -1.0, p.y >= 0.0 ? 1.0 : -1.0);
  float d;
  vec2 outward;
  if (corner.x > 0.0 && corner.y > 0.0) {
    d = length(corner) - r;
    outward = normalize(corner) * side;
  } else if (corner.x > corner.y) {
    d = corner.x - r;
    outward = vec2(side.x, 0.0);
  } else {
    d = corner.y - r;
    outward = vec2(0.0, side.y);
  }
  float coverage = clamp(0.5 - d * uScale, 0.0, 1.0);

  float chamferWidth = min(uBevel, max(r, 1.0));
  float chamfer = chamferWidth > 0.01 ? 1.0 - smoothstep(0.0, chamferWidth, -d) : 0.0;
  vec2 slope = outward * chamfer;

  vec2 wp = p / 220.0;
  vec3 w1 = gradientNoise(wp);
  vec3 w2 = gradientNoise(wp * 2.07 + 13.7);
  vec2 ripple = (w1.yz + w2.yz * 0.5) * 0.5;
  slope += ripple * 0.006;

  float grain = valueNoise(vec2(p.x * 0.008, p.y * 0.55)) * 0.45 +
                valueNoise(vec2(p.x * 0.019 + 3.7, p.y * 0.23)) * 0.35 +
                valueNoise(vec2(p.x * 0.004 + 9.2, p.y * 0.09)) * 0.2;
  float brush = uRough * uRough;
  slope.y += (grain - 0.5) * brush * 0.004;

  vec3 normal = uRotate * normalize(vec3(slope, 1.0));
  vec3 position = uRotate * vec3(p, 0.0);
  vec3 view = normalize(position - vec3(0.0, 0.0, VIEW));
  vec3 bounce = reflect(view, normal);
  vec2 q = bounce.xy / max(bounce.z, 0.2);

  vec2 footprint = fwidth(q);
  vec2 sigma = sqrt(vec2(uBlur / VIEW) * vec2(uBlur / VIEW) + footprint * footprint * 0.5);
  sigma += vec2(0.004, 0.05) * uRough;

  vec3 scene = vec3(room(q, sigma));
  scene *= 1.0 + (grain - 0.5) * brush * 0.3;

  vec2 toPointer = (uPointer - p) / (130.0 + uBlur * 4.0);
  vec2 spread = toPointer * vec2(1.0, 1.0 / (1.0 + 2.5 * uRough));
  float reach = dot(spread, spread);
  float glint = max(1.0 + 3.0 * dot(slope, toPointer), 0.0);
  float glare = (exp(-reach * 1.6) + exp(-reach * 0.35) * 0.15) * glint * uGlare * (1.0 + 0.8 * (grain - 0.5) * brush);
  float highlight = (softbox(q, sigma) * uShine + glare) * mix(0.4, 1.0, uMetal);

  vec3 dark = vec3(0.01, 0.01, 0.014) + uTint * (scene * 0.06 * uMetal + highlight * 0.42);
  vec3 color = min(dark, 0.85) + 0.15 * (1.0 - exp(-max(dark - 0.85, 0.0) / 0.15));
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));

  // Subtle metallic dither
  color += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  color = clamp(color, 0.0, 1.0);

  fragColor = vec4(color * coverage, coverage);
}`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[ReflectiveCard Shader Error]:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createPlateRenderer(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'default'
  });
  if (!gl) return null;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, PLATE_SHADER);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[ReflectiveCard Program Link Error]:', gl.getProgramInfoLog(program));
    return null;
  }

  const uniforms = {
    uSize: gl.getUniformLocation(program, 'uSize'),
    uRadius: gl.getUniformLocation(program, 'uRadius'),
    uScale: gl.getUniformLocation(program, 'uScale'),
    uRotate: gl.getUniformLocation(program, 'uRotate'),
    uBlur: gl.getUniformLocation(program, 'uBlur'),
    uRough: gl.getUniformLocation(program, 'uRough'),
    uMetal: gl.getUniformLocation(program, 'uMetal'),
    uTint: gl.getUniformLocation(program, 'uTint'),
    uShine: gl.getUniformLocation(program, 'uShine'),
    uBevel: gl.getUniformLocation(program, 'uBevel'),
    uGlare: gl.getUniformLocation(program, 'uGlare'),
    uPointer: gl.getUniformLocation(program, 'uPointer'),
    uTime: gl.getUniformLocation(program, 'uTime')
  };

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const rotation = new Float32Array(9);

  return {
    render({ width, height, rotateX, rotateY, pointerX, pointerY, settings, time }) {
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.bindVertexArray(vao);

      const cx = Math.cos(rotateX);
      const sx = Math.sin(rotateX);
      const cy = Math.cos(rotateY);
      const sy = Math.sin(rotateY);
      rotation.set([cy, sx * sy, -cx * sy, 0, cx, sx, sy, -sx * cy, cx * cy]);

      gl.uniform2f(uniforms.uSize, width, height);
      gl.uniform1f(uniforms.uRadius, settings.radius || 18);
      gl.uniform1f(uniforms.uScale, 1.0);
      gl.uniformMatrix3fv(uniforms.uRotate, false, rotation);
      gl.uniform1f(uniforms.uBlur, settings.blurStrength || 6);
      gl.uniform1f(uniforms.uRough, settings.roughness || 0.28);
      gl.uniform1f(uniforms.uMetal, settings.metalness || 1.0);
      gl.uniform3fv(uniforms.uTint, settings.tint || [1, 1, 1]);
      gl.uniform1f(uniforms.uShine, settings.shine || 1.2);
      gl.uniform1f(uniforms.uBevel, settings.bevel || 3.5);
      gl.uniform1f(uniforms.uGlare, settings.glare || 0.6);
      gl.uniform2f(uniforms.uPointer, pointerX, pointerY);
      gl.uniform1f(uniforms.uTime, time || 0);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    }
  };
}

/**
 * Attaches Reflective Card behavior to a card element.
 */
function attachReflectiveCard(cardElement, options = {}) {
  const isPremium = options.isPremium ?? cardElement.classList.contains('pricing-card-premium');

  const settings = {
    tint: isPremium ? [0.94, 0.78, 0.35] : [0.82, 0.85, 0.90], // Gold vs Titanium Silver
    metalness: isPremium ? 1.0 : 0.88,
    roughness: isPremium ? 0.24 : 0.32,
    blurStrength: 6,
    shine: isPremium ? 1.35 : 1.0,
    bevel: isPremium ? 3.8 : 3.0,
    glare: isPremium ? 0.70 : 0.50,
    radius: 18,
    tiltStrength: 14,
    ...options
  };

  cardElement.classList.add('reflective-card', 'reflective-card--dark');
  if (isPremium) cardElement.classList.add('reflective-card--premium');

  // Ensure canvas exists
  let canvas = cardElement.querySelector('.reflective-card__canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'reflective-card__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    cardElement.insertBefore(canvas, cardElement.firstChild);
  }

  // Ensure rim highlight exists
  let rim = cardElement.querySelector('.reflective-card__rim');
  if (!rim) {
    rim = document.createElement('span');
    rim.className = 'reflective-card__rim';
    cardElement.appendChild(rim);
  }

  const renderer = createPlateRenderer(canvas);

  let targetRotateX = 0;
  let targetRotateY = 0;
  let currentRotateX = 0;
  let currentRotateY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;
  let isHovered = false;
  let animFrameId = null;
  let startTime = performance.now();

  function onPointerMove(e) {
    const rect = cardElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    // React Bits tilt physics (rotateX tilts with vertical movement, rotateY with horizontal)
    const maxTilt = (settings.tiltStrength * Math.PI) / 180;
    targetRotateX = -normY * maxTilt;
    targetRotateY = normX * maxTilt;

    targetPointerX = (normX * rect.width) * 0.5;
    targetPointerY = (-normY * rect.height) * 0.5;
    isHovered = true;
  }

  function onPointerLeave() {
    targetRotateX = 0;
    targetRotateY = 0;
    targetPointerX = 0;
    targetPointerY = 0;
    isHovered = false;
  }

  function tick(timestamp) {
    // Smooth lerp interpolation
    const lerpFactor = isHovered ? 0.12 : 0.06;
    currentRotateX += (targetRotateX - currentRotateX) * lerpFactor;
    currentRotateY += (targetRotateY - currentRotateY) * lerpFactor;
    pointerX += (targetPointerX - pointerX) * lerpFactor;
    pointerY += (targetPointerY - pointerY) * lerpFactor;

    const degX = (currentRotateX * 180) / Math.PI;
    const degY = (currentRotateY * 180) / Math.PI;
    const lift = isHovered ? -6 : 0;

    cardElement.style.setProperty('--rc-rotate-x', `${degX.toFixed(2)}deg`);
    cardElement.style.setProperty('--rc-rotate-y', `${degY.toFixed(2)}deg`);
    cardElement.style.setProperty('--rc-lift', `${lift}px`);

    if (renderer) {
      const rect = cardElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);

      const elapsed = (timestamp - startTime) * 0.001;

      renderer.render({
        width: w,
        height: h,
        rotateX: currentRotateX,
        rotateY: currentRotateY,
        pointerX: pointerX * dpr,
        pointerY: pointerY * dpr,
        settings,
        time: elapsed
      });
    }

    animFrameId = requestAnimationFrame(tick);
  }

  cardElement.addEventListener('pointermove', onPointerMove, { passive: true });
  cardElement.addEventListener('pointerleave', onPointerLeave, { passive: true });
  cardElement.addEventListener('pointercancel', onPointerLeave, { passive: true });

  animFrameId = requestAnimationFrame(tick);

  return () => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    cardElement.removeEventListener('pointermove', onPointerMove);
    cardElement.removeEventListener('pointerleave', onPointerLeave);
    cardElement.removeEventListener('pointercancel', onPointerLeave);
    if (renderer) renderer.dispose();
  };
}

/**
 * Initializes Reflective Cards on the pricing section.
 */
export function initReflectiveCards() {
  const cards = document.querySelectorAll('.pricing-grid .pricing-card');
  if (!cards.length) return;

  cards.forEach((card) => {
    attachReflectiveCard(card);
  });

  console.log(`✨ ReflectiveCard: Initialized ${cards.length} reflective metallic shader plates.`);
}

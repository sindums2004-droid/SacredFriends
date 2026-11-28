const vertexSource = `#version 300 es
const vec2 positions[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 source = vec2(0.5, 1.08);
  vec2 mouseOffset = (uMouse - 0.5) * vec2(0.16, 0.08);
  source -= mouseOffset;

  vec2 delta = uv - source;
  float distance = length(delta);
  vec2 dir = normalize(delta);
  vec2 aim = normalize(vec2(0.0, -1.0) - mouseOffset);
  float angle = dot(dir, aim);

  float spread = pow(max(angle, 0.0), 2.0);
  float lengthFade = smoothstep(1.05, 0.12, distance);
  float sideFade = smoothstep(0.0, 0.12, angle);
  float beams = 0.5
    + 0.18 * sin(angle * 42.0 + uTime * 1.1)
    + 0.14 * sin(angle * 71.0 - uTime * 0.7);
  beams = max(beams, 0.0);

  float haze = noise(vec2(angle * 8.0 + uTime * 0.025, distance * 7.0 - uTime * 0.08));
  float rays = spread * lengthFade * sideFade * (0.42 + beams * 0.58) * mix(0.55, 1.0, haze);

  float glow = exp(-distance * 5.5) * 0.35;
  float atmosphere = smoothstep(1.0, 0.0, uv.y) * 0.18;
  float light = (rays * 0.9 + glow + atmosphere) * 0.72;

  vec3 warmWhite = vec3(1.0, 0.93, 0.70);
  vec3 blueWhite = vec3(0.48, 0.62, 0.82);
  vec3 color = mix(warmWhite, blueWhite, smoothstep(0.2, 0.9, distance));
  float alpha = clamp(light * (1.0 - smoothstep(0.78, 1.05, distance)), 0.0, 0.62);
  fragColor = vec4(color * light, alpha);
}`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function initHeroLightRays() {
  const container = document.getElementById('hero-light-rays');
  const opening = document.getElementById('opening');
  if (!container || !opening) return () => {};

  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    powerPreference: 'high-performance'
  });

  if (!gl) return;

  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return;
  }

  const vao = gl.createVertexArray();
  const resolution = gl.getUniformLocation(program, 'uResolution');
  const time = gl.getUniformLocation(program, 'uTime');
  const mouse = gl.getUniformLocation(program, 'uMouse');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointer = { x: 0.5, y: 0.5 };
  let raf = 0;
  let start = performance.now();
  let visible = true;

  function resize() {
    const rect = container.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function draw(now) {
    raf = 0;
    if (!visible) return;

    resize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform1f(time, reducedMotion ? 0 : (now - start) / 1000);
    gl.uniform2f(mouse, pointer.x, pointer.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!reducedMotion) raf = requestAnimationFrame(draw);
  }

  function wake() {
    if (!raf) raf = requestAnimationFrame(draw);
  }

  function updateHeroState() {
    const rect = opening.getBoundingClientRect();
    const active = rect.bottom > 80 && rect.top < window.innerHeight * 0.75;
    document.body.classList.toggle('hero-active', active);
  }

  const resizeObserver = new ResizeObserver(wake);
  resizeObserver.observe(container);
  const intersection = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible) wake();
  });
  intersection.observe(container);

  window.addEventListener('scroll', updateHeroState, { passive: true });
  window.addEventListener('resize', () => {
    resize();
    updateHeroState();
  });
  container.addEventListener('pointermove', event => {
    const rect = container.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / Math.max(1, rect.width);
    pointer.y = (event.clientY - rect.top) / Math.max(1, rect.height);
    wake();
  });

  updateHeroState();
  wake();

  return () => {
    if (raf) cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    intersection.disconnect();
    window.removeEventListener('scroll', updateHeroState);
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  };
}

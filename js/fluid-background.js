/*
 * WebGL Fluid Simulation - x.ai Style
 * High-precision implementation for smooth "smoke" effect.
 */

const canvas = document.getElementById('fluid-canvas');
const gl = canvas.getContext('webgl');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const config = {
    TEXTURE_DOWNSAMPLE: 1,
    DENSITY_DISSIPATION: 0.98,
    VELOCITY_DISSIPATION: 0.99,
    PRESSURE_DISSIPATION: 0.8,
    PRESSURE_ITERATIONS: 25,
    CURL: 30,
    SPLAT_RADIUS: 0.0025
};

let pointers = [];
let splatStack = [];

function getWebGLContext(canvas) {
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
    let gl = canvas.getContext('webgl2', params);
    const isWebGL2 = !!gl;
    if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);

    if (!gl) {
        console.error("Failed to initialize WebGL.");
        return null;
    }

    let halfFloat;
    let supportLinearFiltering;
    if (isWebGL2) {
        gl.getExtension('EXT_color_buffer_float');
        supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
    } else {
        halfFloat = gl.getExtension('OES_texture_half_float');
        gl.getExtension('OES_texture_half_float_linear');
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    return { gl, ext: { halfFloat, supportLinearFiltering } };
}

const context = getWebGLContext(canvas);
if (!context) throw new Error("WebGL context creation failed");
const _gl = context.gl;
const ext = context.ext;

// Determine correct texture type for simulation (FLOAT or HALF_FLOAT)
let simTexType;
if (context.ext.halfFloat) {
    simTexType = context.ext.halfFloat.HALF_FLOAT_OES;
} else {
    // Fallback to FLOAT if standard OES_texture_float is supported (implicit in WebGL2 often, or via extension in 1)
    // For safety, let's try to get FLOAT extension if we didn't get half
    _gl.getExtension('OES_texture_float');
    simTexType = _gl.FLOAT;
}

// Shader Sources
const baseVertexShader = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;
    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`;

const clearShader = `
    precision mediump float;
    uniform sampler2D uTexture;
    uniform float value;
    varying vec2 vUv;
    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
`;

const displayShaderSource = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    void main () {
        vec3 C = texture2D(uTexture, vUv).rgb;
        float a = max(C.r, max(C.g, C.b));
        // x.ai aesthetic: white smoke on dark background
        // The HTML background is black. We render white smoke with alpha.
        gl_FragColor = vec4(1.0, 1.0, 1.0, a); 
    }
`;

const splatShader = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
`;

const advectionShader = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform float dt;
    uniform float dissipation;
    void main () {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        gl_FragColor = dissipation * texture2D(uSource, coord);
        gl_FragColor.a = 1.0;
    }
`;

const divergenceShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`;

const curlShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
`;

const vorticityShader = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;
    void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;
        vec2 vel = texture2D(uVelocity, vUv).xy;
        gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
    }
`;

const pressureShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
`;

const gradientSubtractShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`;

function compileShader(type, source) {
    const shader = _gl.createShader(type);
    _gl.shaderSource(shader, source);
    _gl.compileShader(shader);
    if (!_gl.getShaderParameter(shader, _gl.COMPILE_STATUS)) {
        console.error("Shader Compile Error:", _gl.getShaderInfoLog(shader));
    }
    return shader;
}

function createProgram(vertexSource, fragmentSource) {
    const program = _gl.createProgram();
    const vs = compileShader(_gl.VERTEX_SHADER, vertexSource);
    const fs = compileShader(_gl.FRAGMENT_SHADER, fragmentSource);
    _gl.attachShader(program, vs);
    _gl.attachShader(program, fs);
    _gl.linkProgram(program);
    if (!_gl.getProgramParameter(program, _gl.LINK_STATUS)) {
        console.error("Program Link Error:", _gl.getProgramInfoLog(program));
    }
    return program;
}

function getUniforms(program) {
    let uniforms = {};
    let uniformCount = _gl.getProgramParameter(program, _gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
        let uniformName = _gl.getActiveUniform(program, i).name;
        uniforms[uniformName] = _gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
}

const programs = {
    splat: createProgram(baseVertexShader, splatShader),
    curl: createProgram(baseVertexShader, curlShader),
    vorticity: createProgram(baseVertexShader, vorticityShader),
    divergence: createProgram(baseVertexShader, divergenceShader),
    pressure: createProgram(baseVertexShader, pressureShader),
    gradienSubtract: createProgram(baseVertexShader, gradientSubtractShader),
    advection: createProgram(baseVertexShader, advectionShader),
    display: createProgram(baseVertexShader, displayShaderSource),
    clear: createProgram(baseVertexShader, clearShader)
};

function createDoubleFBO(w, h, type, filter) {
    let fbo1 = createFBO(w, h, type, filter);
    let fbo2 = createFBO(w, h, type, filter);
    return {
        get read() { return fbo1; },
        get write() { return fbo2; },
        swap() { let temp = fbo1; fbo1 = fbo2; fbo2 = temp; }
    };
}

function createFBO(w, h, type, filter) {
    const texture = _gl.createTexture();
    _gl.bindTexture(_gl.TEXTURE_2D, texture);
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, filter || _gl.NEAREST);
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, filter || _gl.NEAREST);
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
    // CRITICAL FIX: Use 'type' correctly here (FLOAT/HALF_FLOAT)
    _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, w, h, 0, _gl.RGBA, type, null);

    const fbo = _gl.createFramebuffer();
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, fbo);
    _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, texture, 0);
    _gl.viewport(0, 0, w, h);
    _gl.clear(_gl.COLOR_BUFFER_BIT);

    return { fbo, texture, width: w, height: h, attach: (id) => _gl.activeTexture(_gl.TEXTURE0 + id) || _gl.bindTexture(_gl.TEXTURE_2D, texture) };
}

// Initialize FBOs with correct High Precision type
// Use simTexType (FLOAT or HALF_FLOAT)
let density = createDoubleFBO(canvas.width, canvas.height, simTexType, _gl.LINEAR);
let velocity = createDoubleFBO(canvas.width, canvas.height, simTexType, _gl.LINEAR);
let divergence = createFBO(canvas.width, canvas.height, simTexType, _gl.NEAREST);
let curl = createFBO(canvas.width, canvas.height, simTexType, _gl.NEAREST);
let pressure = createDoubleFBO(canvas.width, canvas.height, simTexType, _gl.NEAREST);

const blit = (() => {
    const buffer = _gl.createBuffer();
    _gl.bindBuffer(_gl.ARRAY_BUFFER, buffer);
    _gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), _gl.STATIC_DRAW);
    _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, _gl.createBuffer());
    _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), _gl.STATIC_DRAW);
    return (destination) => {
        _gl.bindFramebuffer(_gl.FRAMEBUFFER, destination ? destination.fbo : null);
        _gl.drawElements(_gl.TRIANGLES, 6, _gl.UNSIGNED_SHORT, 0);
    }
})();

let lastTime = Date.now();
function update() {
    const dt = Math.min((Date.now() - lastTime) / 1000, 0.016);
    lastTime = Date.now();

    _gl.viewport(0, 0, canvas.width, canvas.height);

    // Splat
    if (splatStack.length > 0) {
        _gl.useProgram(programs.splat);
        const uniforms = getUniforms(programs.splat);
        _gl.uniform1i(uniforms.uTarget, 0);
        _gl.uniform1f(uniforms.aspectRatio, canvas.width / canvas.height);

        for (let i = 0; i < splatStack.length; i++) {
            const { x, y, dx, dy, color } = splatStack[i];
            _gl.uniform2f(uniforms.point, x / canvas.width, 1.0 - y / canvas.height);
            _gl.uniform3f(uniforms.color, dx, -dy, 1.0); // velocity splat
            _gl.uniform1f(uniforms.radius, config.SPLAT_RADIUS);

            velocity.read.attach(0);
            _gl.bindFramebuffer(_gl.FRAMEBUFFER, velocity.write.fbo);
            blit(velocity.write);
            velocity.swap();

            _gl.uniform3f(uniforms.color, color.r, color.g, color.b); // density splat
            density.read.attach(0);
            _gl.bindFramebuffer(_gl.FRAMEBUFFER, density.write.fbo);
            blit(density.write);
            density.swap();
        }
        splatStack = [];
    }

    // Physics Phases using Advection, Curl, Vorticity, Divergence, Pressure
    // 1. Curl
    _gl.useProgram(programs.curl);
    let uniforms = getUniforms(programs.curl);
    _gl.uniform2f(uniforms.texelSize, 1.0 / canvas.width, 1.0 / canvas.height);
    _gl.uniform1i(uniforms.uVelocity, 0);
    velocity.read.attach(0);
    blit(curl);

    // 2. Vorticity
    _gl.useProgram(programs.vorticity);
    uniforms = getUniforms(programs.vorticity);
    _gl.uniform2f(uniforms.texelSize, 1.0 / canvas.width, 1.0 / canvas.height);
    _gl.uniform1i(uniforms.uVelocity, 0);
    _gl.uniform1i(uniforms.uCurl, 1);
    _gl.uniform1f(uniforms.curl, config.CURL);
    _gl.uniform1f(uniforms.dt, dt);
    velocity.read.attach(0);
    curl.attach(1);
    blit(velocity.write);
    velocity.swap();

    // 3. Divergence
    _gl.useProgram(programs.divergence);
    uniforms = getUniforms(programs.divergence);
    _gl.uniform2f(uniforms.texelSize, 1.0 / canvas.width, 1.0 / canvas.height);
    _gl.uniform1i(uniforms.uVelocity, 0);
    velocity.read.attach(0);
    blit(divergence);

    // 4. Clear Pressure
    _gl.useProgram(programs.clear);
    uniforms = getUniforms(programs.clear);
    _gl.uniform1i(uniforms.uTexture, 0);
    _gl.uniform1f(uniforms.value, config.PRESSURE_DISSIPATION);
    pressure.read.attach(0);
    blit(pressure.write);
    pressure.swap();

    // 5. Pressure Solver
    _gl.useProgram(programs.pressure);
    uniforms = getUniforms(programs.pressure);
    _gl.uniform2f(uniforms.texelSize, 1.0 / canvas.width, 1.0 / canvas.height);
    _gl.uniform1i(uniforms.uDivergence, 0);
    _gl.uniform1i(uniforms.uPressure, 1);
    divergence.attach(0);
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        pressure.read.attach(1);
        blit(pressure.write);
        pressure.swap();
    }

    // 6. Subtract Gradient
    _gl.useProgram(programs.gradienSubtract);
    uniforms = getUniforms(programs.gradienSubtract);
    _gl.uniform2f(uniforms.texelSize, 1.0 / canvas.width, 1.0 / canvas.height);
    _gl.uniform1i(uniforms.uPressure, 0);
    _gl.uniform1i(uniforms.uVelocity, 1);
    pressure.read.attach(0);
    velocity.read.attach(1);
    blit(velocity.write);
    velocity.swap();

    // 7. Advection (Velocity)
    _gl.useProgram(programs.advection);
    uniforms = getUniforms(programs.advection);
    _gl.uniform2f(uniforms.texelSize, 1.0 / canvas.width, 1.0 / canvas.height);
    _gl.uniform1i(uniforms.uVelocity, 0);
    _gl.uniform1i(uniforms.uSource, 0);
    _gl.uniform1f(uniforms.dt, dt);
    _gl.uniform1f(uniforms.dissipation, config.VELOCITY_DISSIPATION);
    velocity.read.attach(0);
    blit(velocity.write);
    velocity.swap();

    // 8. Advection (Density)
    _gl.uniform1i(uniforms.uVelocity, 0);
    _gl.uniform1i(uniforms.uSource, 1);
    _gl.uniform1f(uniforms.dissipation, config.DENSITY_DISSIPATION);
    velocity.read.attach(0);
    density.read.attach(1);
    blit(density.write);
    density.swap();

    // 9. Display
    _gl.useProgram(programs.display);
    uniforms = getUniforms(programs.display);
    _gl.uniform1i(uniforms.uTexture, 0);
    density.read.attach(0);
    blit(null);

    requestAnimationFrame(update);
}

// Interaction
window.addEventListener('mousemove', e => {
    splatStack.push({
        x: e.clientX,
        y: e.clientY,
        dx: e.movementX * 10,
        dy: e.movementY * 10,
        color: { r: 0.1, g: 0.1, b: 0.1 } // Very subtle white smoke input
    });
});

update();

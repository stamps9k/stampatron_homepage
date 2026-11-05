/* STAMPATRON: a self-contained WebGL logo + 2D synthwave landscape.
 * No libraries, no module loader, no global listeners affecting the rest of the site.
 * Depends only on window.StampatronLogoMesh from synthwave-logo-data.js.
 * Your site uses Bootstrap 5 + vanilla JS; this component does not modify either.
 */
(() => {
  'use strict';
  const root = document.querySelector('[data-synthwave-hero]');
  if (!root || !window.StampatronLogoMesh) return;

  const $ = selector => root.querySelector(selector);
  const groundCanvas = $('[data-sw-ground]');
  const logoCanvas = $('[data-sw-logo]');
  const fallback = $('[data-sw-fallback]');
  const fpsEl = $('[data-sw-fps]');
  const yawEl = $('[data-sw-yaw]');
  const vertEl = $('[data-sw-verts]');
  const trisEl = $('[data-sw-tris]');
  const pipelineEl = $('[data-sw-pipeline]');
  const shaderEl = $('[data-sw-shader]');
  // HUD labels for whichever renderer is actually drawing the logo.
  const MODES = {
    webgl:    ['PIPELINE / WEBGL',    'SHADER: LOADED ▰'],
    software: ['PIPELINE / SOFTWARE', 'SHADER: CPU ▱'],
    static:   ['PIPELINE / STATIC',   'SHADER: OFFLINE ▱']
  };
  // The fallback image is only downloaded if it's actually needed.
  function showFallback() {
    if (!fallback.getAttribute('src')) fallback.src = fallback.dataset.src;
    fallback.hidden = false;
  }
  function setMode(mode) {
    pipelineEl.textContent = MODES[mode][0];
    shaderEl.textContent = MODES[mode][1];
  }
  const gl = logoCanvas.getContext('webgl', {
    alpha: true, antialias: true, depth: true, premultipliedAlpha: false
  });
  const ground = groundCanvas.getContext('2d', { alpha: false });
  const meshes = window.StampatronLogoMesh;
  const vertexCount = meshes.reduce((sum, mesh) => sum + mesh.p.length / 3, 0);
  const triangleCount = vertexCount / 3;
  vertEl.textContent = String(vertexCount);
  trisEl.textContent = String(triangleCount);
  const reducedMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  const ROTATION_SECONDS = 30;        // 360 degrees every 30 seconds
  const FORWARD_SPEED = 0.48;         // Scrolling scenery (world units per second)
  const targetFps = 60;
  const DPR_CAP = 1.75;               // Controls GPU cost on high-density screens
  let request = 0, lastFrame = 0, elapsed = 0, fpsTime = 0, fpsFrames = 0;
  let inViewport = true, isVisible = !document.hidden;
  let logoRenderer = null;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const reason = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw Error(reason);
    }
    return shader;
  }

  function initLogo(gl) {
    if (!gl) return null;
    const vs = `
      attribute vec3 position;
      attribute vec3 normal;
      uniform mat4 transform;
      varying vec3 vNormal;
      void main() {
        gl_Position = transform * vec4(position.x, position.y - 0.6, position.z, 1.0);
        vNormal = normal;
      }
    `;
    const fs = `
      precision mediump float;
      varying vec3 vNormal;
      uniform vec3 baseColor;
      uniform mat3 rotation;
      void main() {
        vec3 N = normalize(rotation * vNormal);
        float lit = 0.56 + 0.44 * max(0.0, dot(N, normalize(vec3(-0.30, 0.48, 0.84))));
        gl_FragColor = vec4(baseColor * lit, 1.0);
      }
    `;
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    const attr = { p: gl.getAttribLocation(program, 'position'), n: gl.getAttribLocation(program, 'normal') };
    const uniform = { transform: gl.getUniformLocation(program, 'transform'),
      rotation: gl.getUniformLocation(program, 'rotation'),
      color: gl.getUniformLocation(program, 'baseColor') };
    const objects = meshes.map(mesh => {
      const buffers = {};
      for (const k of ['p','n']) {
        buffers[k] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[k]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh[k]), gl.STATIC_DRAW);
      }
      return { name: mesh.name, buffers, count: mesh.p.length / 3, color: mesh.c };
    });
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);          // Draw both sides during the full rotation
    gl.clearColor(0, 0, 0, 0);
    return {
      render(yaw) {
        const w = logoCanvas.width, h = logoCanvas.height;
        if (!w || !h) return;
        gl.viewport(0,0,w,h);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);
        const pitch = -0.08;
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        const cx = Math.cos(pitch), sx = Math.sin(pitch);
        const r = [cy, sx*sy, -cx*sy, 0, cx, sx, sy, -sx*cy, cx*cy];
        // Orthographic camera with a little extra space to avoid clipping at edges.
        const halfX = 7.50;
        const halfY = halfX * h / w;
        const m = [r[0]/halfX,r[1]/halfY,-r[2]/30,0,
                   r[3]/halfX,r[4]/halfY,-r[5]/30,0,
                   r[6]/halfX,r[7]/halfY,-r[8]/30,0,
                   0,0,0,1];
        gl.uniformMatrix4fv(uniform.transform, false, new Float32Array(m));
        gl.uniformMatrix3fv(uniform.rotation, false, new Float32Array(r));
        for (const obj of objects) {
          for (const k of ['p','n']) {
            gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffers[k]);
            gl.enableVertexAttribArray(attr[k]);
            gl.vertexAttribPointer(attr[k], 3, gl.FLOAT, false, 0, 0);
          }
          gl.uniform3fv(uniform.color, new Float32Array(obj.color));
          gl.drawArrays(gl.TRIANGLES, 0, obj.count);
        }
      }
    };
  }

  // CPU fallback: keep the rotation working when WebGL is unavailable.
  // This renders the same original triangle mesh with a painter's algorithm.
  function initSoftwareLogo(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return {
      render(yaw) {
        const w = canvas.width, h = canvas.height;
        if (!w || !h) return;
        const pitch = -0.08;
        const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch);
        const halfX=7.50, halfY=halfX*h/w;
        ctx.clearRect(0,0,w,h);
        const faces=[];
        for(const mesh of meshes) {
          const p=mesh.p, n=mesh.n, c=mesh.c;
          for(let i=0;i<p.length;i+=9) {
            const projected=[];
            let depth=0;
            for(let j=0;j<9;j+=3) {
              const x=p[i+j],y=p[i+j+1]-.6,z=p[i+j+2];
              const X=cy*x+sy*z;
              const Y=sx*sy*x+cx*y-sx*cy*z;
              const Z=-cx*sy*x+sx*y+cx*cy*z;
              projected.push([w*(.5+X/(2*halfX)),h*(.5-Y/(2*halfY))]);
              depth+=Z;
            }
            const nx=n[i],ny=n[i+1],nz=n[i+2];
            const NX=cy*nx+sy*nz;
            const NY=sx*sy*nx+cx*ny-sx*cy*nz;
            const NZ=-cx*sy*nx+sx*ny+cx*cy*nz;
            const len=Math.hypot(NX,NY,NZ)||1;
            const dot=Math.max(0,(NX*(-.30)+NY*.48+NZ*.84)/(len*Math.hypot(-.30,.48,.84)));
            const lit=.56+.44*dot;
            faces.push({depth:depth/3,projected,color:`rgb(${c.map(v=>Math.round(255*Math.max(0,Math.min(1,v*lit)))).join(',')})`});
          }
        }
        faces.sort((a,b)=>a.depth-b.depth);
        for(const f of faces) {
          ctx.beginPath();
          ctx.moveTo(...f.projected[0]);
          ctx.lineTo(...f.projected[1]);
          ctx.lineTo(...f.projected[2]);
          ctx.closePath();
          ctx.fillStyle=f.color;
          ctx.fill();
        }
      }
    };
  }

  // Ground: perspective-correct scrolling horizon/grid with layered mountains.
  // Distances move toward the camera instead of translating a flat texture.
  function drawGround(timeSeconds) {
    if (!ground) return;
    const w = groundCanvas.width, h = groundCanvas.height;
    if (!w || !h) return;
    const ctx = ground;
    const horizon = h * 0.60;
    const step = FORWARD_SPEED * timeSeconds;
    const scale = w / 1000;
    const dpr = w / groundCanvas.clientWidth;
    ctx.clearRect(0,0,w,h);
    const sky = ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,'#13232d');sky.addColorStop(.60,'#10212a');sky.addColorStop(1,'#07151d');
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    const glow=ctx.createRadialGradient(w/2,h*.58,0,w/2,h*.58,w*.45);
    glow.addColorStop(0,'rgba(39,149,151,.13)');glow.addColorStop(1,'rgba(39,149,151,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    // Distant mountains are nearly static; nearer ranges drift slightly for parallax.
    // Each range is one screen-width tile of [x, height, hasRidges] points that
    // repeats seamlessly, so the scroll can wrap at exactly 1.0 with no visible jump.
    const ranges = [
      {speed:0.010, color:'rgba(66,163,166,.25)', ridge:'rgba(68,165,167,.11)', points:[
        [.00,.03],[.11,.09,1],[.17,.04],[.22,.16,1],[.31,.10],[.39,.08,1],[.45,.19],
        [.51,.04,1],[.59,.08],[.66,.16,1],[.74,.05],[.84,.11,1],[.93,.06]]},
      {speed:0.028, color:'rgba(76,199,189,.51)', ridge:'rgba(92,201,189,.24)', points:[
        [.06,.14,1],[.15,.05],[.23,.24,1],[.31,.08],[.38,.17,1],[.44,.06],
        [.53,.13,1],[.61,.04],[.70,.21,1],[.78,.07],[.88,.18,1],[.98,.06]]}
    ];
    ranges.forEach(range=>{
      const offset = (timeSeconds * range.speed) % 1;
      // Tiles -1..2 guarantee both screen edges are covered at any offset.
      const peaks=[];
      for(let tile=-1;tile<=2;tile++) {
        for(const [x,height,ridges] of range.points) {
          peaks.push([(x + tile - offset) * w, horizon - height*h*.8, ridges]);
        }
      }
      ctx.lineWidth=Math.max(1,dpr*.85);
      ctx.strokeStyle=range.color;
      ctx.beginPath();peaks.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
      // Angular wireframe ridges connecting summits with horizon.
      ctx.strokeStyle=range.ridge;
      for(const [x,y,ridges] of peaks){
        if(!ridges) continue;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x - w*.055,horizon + h*.015);
        ctx.moveTo(x,y);ctx.lineTo(x+w*.075,horizon+h*.024);ctx.stroke();
      }
    });
    const floor=ctx.createLinearGradient(0,horizon,0,h);
    floor.addColorStop(0,'rgba(5,19,27,.20)');floor.addColorStop(1,'rgba(4,12,17,.81)');
    ctx.fillStyle=floor;ctx.fillRect(0,horizon,w,h-horizon);
    ctx.lineWidth=Math.max(0.9,dpr*.70);
    ctx.strokeStyle='rgba(52,183,181,.47)';
    const vanX=w/2;
    for(let lane=-14;lane<=14;lane++) {
      const xBottom=vanX+lane*w*.115;
      ctx.beginPath();ctx.moveTo(vanX + lane*w*.005,horizon);ctx.lineTo(xBottom,h*1.12);ctx.stroke();
    }
    // Project evenly spaced world-depth lines. Wrapping the depth offset gives a
    // continuous forward-motion illusion without flashing or snapping.
    const offset = (step%1+1)%1;
    for(let i=0;i<=22;i++) {
      const depth = (i+offset)/22;
      if(depth<=.001 || depth>1.05)continue;
      const y=horizon+(h-horizon)*Math.pow(depth,1.68);
      ctx.globalAlpha=.25+.72*depth;
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
    }
    ctx.globalAlpha=1;
    const edge=ctx.createLinearGradient(0,horizon-5,0,horizon+16);
    edge.addColorStop(0,'transparent');edge.addColorStop(.5,'rgba(92,201,189,.19)');edge.addColorStop(1,'transparent');
    ctx.fillStyle=edge;ctx.fillRect(0,horizon-5,w,21);
  }

  function resizeCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width=width;canvas.height=height;
    }
  }

  function redraw() {
    resizeCanvas(groundCanvas);resizeCanvas(logoCanvas);
    drawGround(elapsed);
    if (logoRenderer) {
      logoRenderer.render(elapsed / ROTATION_SECONDS * TAU);
      yawEl.textContent = ((elapsed/ROTATION_SECONDS*360)%360).toFixed(1)+'°';
    } else {
      yawEl.textContent = '0.0°';   // static image is a front-on view and doesn't rotate
    }
  }

  function frame(timestamp) {
    request=0;
    if (!inViewport || !isVisible || reducedMedia.matches) return;
    if (!lastFrame) lastFrame=timestamp;
    const delta=Math.max(0, (timestamp-lastFrame)/1000); // elapsed time, not frame count
    lastFrame=timestamp;
    elapsed+=delta;
    fpsTime+=delta;fpsFrames++;
    if (fpsTime>=0.75) {
      fpsEl.textContent=(fpsFrames/fpsTime).toFixed(0);
      fpsTime=0;fpsFrames=0;
    }
    redraw();request=window.requestAnimationFrame(frame);
  }
  function sync() {
    const shouldRun=inViewport && isVisible && !reducedMedia.matches;
    if (!shouldRun) {
      if(request) cancelAnimationFrame(request);
      request=0;lastFrame=0;
      if(reducedMedia.matches) {elapsed=0;fpsEl.textContent='—';}
      redraw();
    } else if (!request) {lastFrame=0;request=window.requestAnimationFrame(frame);}
  }
  document.addEventListener('visibilitychange',()=>{isVisible=!document.hidden;sync();});
  if (typeof IntersectionObserver!=='undefined') {
    const observer=new IntersectionObserver(entries=>{inViewport=entries[0]?.isIntersecting ?? false;sync();},{threshold:0.02});
    observer.observe(root);
  }
  if (typeof ResizeObserver!=='undefined') {
    new ResizeObserver(()=>{if(!request)redraw();}).observe(logoCanvas);
  } else window.addEventListener('resize',redraw);
  if(reducedMedia.addEventListener)reducedMedia.addEventListener('change',sync);
  else reducedMedia.addListener(sync);
  // Prefer WebGL; fall back to the CPU rasteriser, then to the static image.
  try {
    logoRenderer=initLogo(gl);
    if (logoRenderer) setMode('webgl');
  } catch(error) {
    console.warn('STAMPATRON: WebGL renderer failed:', error);
    logoRenderer=null;
  }
  // Only try the 2D renderer if no WebGL context was created; a canvas that
  // already has a WebGL context cannot also hand out a 2D one.
  if (!logoRenderer && !gl) {
    logoRenderer=initSoftwareLogo(logoCanvas);
    if (logoRenderer) setMode('software');
  }
  if (logoRenderer) {
    fallback.hidden=true;
  } else {
    console.warn('STAMPATRON: static image fallback in use');
    setMode('static');
    showFallback();
    logoCanvas.style.display='none';
  }
  // A lost context should never make the entire website disappear.
  logoCanvas.addEventListener('webglcontextlost',e=>{e.preventDefault();logoRenderer=null;showFallback();setMode('static');});
  logoCanvas.addEventListener('webglcontextrestored',()=>{try{logoRenderer=initLogo(gl);fallback.hidden=true;setMode('webgl');}catch(e){showFallback();setMode('static');}});
  redraw();sync();
})();

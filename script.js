// === GSAP TEXT ANIMATIONS ===
gsap.to("#sleeveWord", {
  opacity: 1,
  duration: 1.8,
  ease: "power4.out",
  delay: 0.4
});
gsap.to(".desc-left", {
  opacity: 1,
  x: 0,
  duration: 1.5,
  ease: "power3.out",
  delay: 1
});
gsap.to(".desc-right", {
  opacity: 1,
  x: 0,
  duration: 1.5,
  ease: "power3.out",
  delay: 1.3
});

// === FOG OVERLAY ===
const fog = document.createElement("div");
fog.className = "fog-overlay";
document.body.appendChild(fog);

// === WEBGL BACKGROUND GRID ===
const gridScene = new THREE.Scene();
const gridCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10);
gridCamera.position.z = 5;

const gridRenderer = new THREE.WebGLRenderer({ alpha: true });
gridRenderer.setSize(window.innerWidth, window.innerHeight);
gridRenderer.setPixelRatio(window.devicePixelRatio);
gridRenderer.domElement.style.position = 'fixed';
gridRenderer.domElement.style.zIndex = 0;
document.body.appendChild(gridRenderer.domElement);

const gridMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    void main() {
      float grid = step(0.98, fract(vUv.x * 10.0)) + step(0.98, fract(vUv.y * 10.0));
      float glow = smoothstep(0.0, 1.0, 1.0 - distance(vUv, vec2(0.5)));
      gl_FragColor = vec4(vec3(grid * 0.2 + glow * 0.1), 0.06);
    }
  `,
  transparent: true
});
const gridPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), gridMaterial);
gridScene.add(gridPlane);

// === MAIN SCENE ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 100);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('modelCanvas'), alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.domElement.style.zIndex = 2;

// === LIGHTING ===
scene.add(new THREE.AmbientLight(0xffffff, 1.6)); // increased brightness

const spotlight = new THREE.SpotLight(0xffffff, 4, 400, Math.PI / 6, 0.2, 1);
spotlight.position.set(30, 30, 60);
spotlight.castShadow = true;
scene.add(spotlight);

// === PARTICLE DUST ===
const dustGeo = new THREE.BufferGeometry();
const count = 300;
const pos = new Float32Array(count * 3);
for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 300;
dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
const dustMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, opacity: 0.3, transparent: true });
const dust = new THREE.Points(dustGeo, dustMat);
scene.add(dust);

// === CONTROLS ===
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enableZoom = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;

let userInteracted = false;
let userTimeout;
let wasDragging = false;

controls.addEventListener("start", () => {
  controls.autoRotate = false;
  userInteracted = true;
  wasDragging = true;
  clearTimeout(userTimeout);
});

controls.addEventListener("end", () => {
  wasDragging = false;
  userTimeout = setTimeout(() => {
    controls.autoRotate = true;
  }, 1000);
});

// === MODEL LOGIC ===
let mesh, cloneMesh, exploded = false;
const loader = new THREE.STLLoader();

loader.load("assets/models/sleeve.STL", (geometry) => {
  geometry.computeBoundingBox();
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  const scale = 40 / Math.max(size.x, size.y, size.z);
  geometry.scale(scale, scale, scale);
  geometry.center();

  const mat = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    roughness: 0.2,
    metalness: 0.6,
    emissive: 0x000000
  });

  mesh = new THREE.Mesh(geometry, mat);
  mesh.rotation.set(0, 0, 0); // reset everything
  mesh.rotateX(Math.PI / 4); // stand it upright
  mesh.rotateY(-Math.PI / 2);
  mesh.scale.set(3, 3, 3);  // slight front angle
  scene.add(mesh);



gsap.to(mesh.scale, {
  x: 1, y: 1, z: 1,
  duration: 2,
  ease: "power4.out"
});

gsap.fromTo(camera.position, 
  { z: 180 }, // further out
  { z: 100, duration: 2, ease: "power4.out" }
);

  cloneMesh = mesh.clone();
  cloneMesh.position.z = -1;
  cloneMesh.visible = false;
  scene.add(cloneMesh);

  // HOVER ROTATION
  document.querySelector(".desc-left").addEventListener("mouseenter", () => {
    gsap.to(mesh.rotation, { y: Math.PI / 3, duration: 1 });
  });
  document.querySelector(".desc-right").addEventListener("mouseenter", () => {
    gsap.to(mesh.rotation, { y: -Math.PI / 3, duration: 1 });
  });
  document.querySelector(".desc-left").addEventListener("mouseleave", resetRotation);
  document.querySelector(".desc-right").addEventListener("mouseleave", resetRotation);

  function resetRotation() {
    if (!userInteracted) {
      gsap.to(mesh.rotation, { y: Math.PI / 4, duration: 1 });
    }
  }

  // CLEAN EXPLODE ON ACTUAL CLICK
  renderer.domElement.addEventListener("pointerdown", () => {
    wasDragging = false;
  });

  renderer.domElement.addEventListener("pointermove", () => {
    wasDragging = true;
  });

  renderer.domElement.addEventListener("pointerup", () => {
    if (!wasDragging) toggleExplode();
  });

  function toggleExplode() {
    if (!exploded) {
      cloneMesh.visible = true;
      gsap.to(mesh.position, { z: 2, duration: 1 });
      gsap.to(cloneMesh.position, { z: -2, duration: 1 });
      gsap.to(camera.position, { z: 130, duration: 1.2 });
      exploded = true;
    } else {
      gsap.to(mesh.position, { z: 0, duration: 1 });
      gsap.to(cloneMesh.position, { z: -1, duration: 1 });
      gsap.to(camera.position, { z: 100, duration: 1.2 });
      setTimeout(() => cloneMesh.visible = false, 1000);
      exploded = false;
    }
  }

  animate();
});

// === ANIMATION LOOP ===
function animate() {
  requestAnimationFrame(animate);

  if (mesh) {
    const t = performance.now() * 0.002;
    mesh.material.emissiveIntensity = 0.4 + Math.sin(t) * 0.2;
  }

  spotlight.position.x = Math.sin(Date.now() * 0.001) * 40;
  dust.rotation.y += 0.0004;

  controls.update();
  gridRenderer.render(gridScene, gridCamera);
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  gridRenderer.setSize(window.innerWidth, window.innerHeight);
});

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { copy, type Language } from "../i18n";

type Point = [number, number];

// Conceptual central-core layout, not a traced or dimensioned approved plan.
const outline: Point[] = [
  [-12, -4],
  [-8, -4],
  [-8, -10],
  [-2, -10],
  [-2, -7],
  [2, -7],
  [2, -10],
  [8, -10],
  [8, -4],
  [12, -4],
  [12, 4],
  [8, 4],
  [8, 10],
  [2, 10],
  [2, 7],
  [-2, 7],
  [-2, 10],
  [-8, 10],
  [-8, 4],
  [-12, 4],
];

// Openings in core-facing partitions stand in for unit entrance doors.
const interiorWalls: [Point, Point][] = [
  [
    [-3, -7],
    [-3, -2.8],
  ],
  [
    [-3, -1.7],
    [-3, 1.7],
  ],
  [
    [-3, 2.8],
    [-3, 7],
  ],
  [
    [3, -7],
    [3, -2.8],
  ],
  [
    [3, -1.7],
    [3, 1.7],
  ],
  [
    [3, 2.8],
    [3, 7],
  ],
  [
    [-3, -3],
    [-0.6, -3],
  ],
  [
    [0.6, -3],
    [3, -3],
  ],
  [
    [-3, 3],
    [-0.6, 3],
  ],
  [
    [0.6, 3],
    [3, 3],
  ],
  [
    [-12, 0],
    [-3, 0],
  ],
  [
    [3, 0],
    [12, 0],
  ],
  [
    [-8, -4],
    [-3, -4],
  ],
  [
    [3, -4],
    [8, -4],
  ],
  [
    [-8, 4],
    [-3, 4],
  ],
  [
    [3, 4],
    [8, 4],
  ],
  [
    [-8, -7],
    [-3, -7],
  ],
  [
    [3, -7],
    [8, -7],
  ],
  [
    [-8, 7],
    [-3, 7],
  ],
  [
    [3, 7],
    [8, 7],
  ],
  [
    [-8, -4],
    [-8, -2.8],
  ],
  [
    [-8, -1.8],
    [-8, 1.8],
  ],
  [
    [-8, 2.8],
    [-8, 4],
  ],
  [
    [8, -4],
    [8, -2.8],
  ],
  [
    [8, -1.8],
    [8, 1.8],
  ],
  [
    [8, 2.8],
    [8, 4],
  ],
  [
    [-5.4, -10],
    [-5.4, -7],
  ],
  [
    [-5.4, 7],
    [-5.4, 10],
  ],
  [
    [5.4, -10],
    [5.4, -7],
  ],
  [
    [5.4, 7],
    [5.4, 10],
  ],
  [
    [-10, -4],
    [-10, 0],
  ],
  [
    [-10, 0],
    [-10, 4],
  ],
  [
    [10, -4],
    [10, 0],
  ],
  [
    [10, 0],
    [10, 4],
  ],
];

const unitFloors: [number, number, number, number][] = [
  [-7.5, -2, 8.7, 3.7],
  [-7.5, 2, 8.7, 3.7],
  [7.5, -2, 8.7, 3.7],
  [7.5, 2, 8.7, 3.7],
  [-5.2, -7, 5.7, 5.7],
  [5.2, -7, 5.7, 5.7],
  [-5.2, 7, 5.7, 5.7],
  [5.2, 7, 5.7, 5.7],
];

export function Structure3DView({ language }: { language: Language }) {
  const t = copy[language];
  const mountRef = useRef<HTMLDivElement>(null);
  const ceilingRef = useRef<THREE.Group | null>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const renderRef = useRef<(() => void) | null>(null);
  const [showCeiling, setShowCeiling] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [sceneError, setSceneError] = useState(false);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setSceneError(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x15232b);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 150);
    camera.position.set(19, 20, 22);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.6, 0);
    controls.minDistance = 9;
    controls.maxDistance = 85;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.enableDamping = false;
    controls.update();
    controls.saveState();
    resetRef.current = () => {
      controls.reset();
      render();
    };

    scene.add(new THREE.HemisphereLight(0xddeeff, 0x6e8a91, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.3);
    sun.position.set(8, 20, 14);
    scene.add(sun);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const material = (color: number, opacity = 1) => {
      const m = new THREE.MeshStandardMaterial({
        color,
        transparent: opacity < 1,
        opacity,
        side: THREE.DoubleSide,
        roughness: 0.74,
        depthWrite: opacity === 1,
      });
      materials.push(m);
      return m;
    };
    const floorMaterial = material(0xc8d9d7);
    const wallMaterial = material(0x7fb2bb, 0.84);
    const outerMaterial = material(0xbee6e5, 0.5);
    const ceilingMaterial = material(0x8dc9ce, 0.32);
    const coreMaterial = material(0x547987, 0.7);
    const unitMaterialA = material(0xe1d4bc);
    const unitMaterialB = material(0xd5e4d6);
    const wetAreaMaterial = material(0x89a9b7);
    const liftMaterial = material(0x397c91, 0.9);
    const stairMaterial = material(0xe2ad68);
    const issueMaterial = material(0xf35c4f);
    const ringMaterial = material(0xffc166);

    const floorShape = new THREE.Shape();
    outline.forEach(([x, z], index) =>
      index ? floorShape.lineTo(x, z) : floorShape.moveTo(x, z),
    );
    floorShape.closePath();
    const floorGeometry = new THREE.ExtrudeGeometry(floorShape, {
      depth: 0.22,
      bevelEnabled: false,
    });
    geometries.push(floorGeometry);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.22;
    scene.add(floor);

    const addBox = (
      width: number,
      height: number,
      depth: number,
      x: number,
      y: number,
      z: number,
      source: THREE.Material,
    ) => {
      const geometry = new THREE.BoxGeometry(width, height, depth);
      geometries.push(geometry);
      const box = new THREE.Mesh(geometry, source);
      box.position.set(x, y, z);
      scene.add(box);
      return box;
    };
    unitFloors.forEach(([x, z, width, depth], index) =>
      addBox(
        width,
        0.025,
        depth,
        x,
        0.025,
        z,
        index % 2 ? unitMaterialA : unitMaterialB,
      ),
    );
    // Small wet-area tiles identify service rooms without claiming their real positions.
    for (const x of [-4.2, 4.2]) {
      for (const z of [-5.2, 5.2])
        addBox(1.35, 0.035, 1.2, x, 0.065, z, wetAreaMaterial);
    }
    for (const x of [-4.15, 4.15]) {
      for (const z of [-1.1, 1.1])
        addBox(1.2, 0.035, 1, x, 0.065, z, wetAreaMaterial);
    }

    const addWall = (
      [ax, az]: Point,
      [bx, bz]: Point,
      source: THREE.Material,
      height = 1.65,
    ) => {
      const length = Math.hypot(bx - ax, bz - az);
      const geometry = new THREE.BoxGeometry(length, height, 0.14);
      geometries.push(geometry);
      const wall = new THREE.Mesh(geometry, source);
      wall.position.set((ax + bx) / 2, height / 2, (az + bz) / 2);
      wall.rotation.y = -Math.atan2(bz - az, bx - ax);
      scene.add(wall);
    };
    outline.forEach((p, index) =>
      addWall(p, outline[(index + 1) % outline.length], outerMaterial),
    );
    interiorWalls.forEach(([a, b]) => addWall(a, b, wallMaterial, 1.4));

    const coreGeometry = new THREE.BoxGeometry(5.6, 0.08, 5.6);
    geometries.push(coreGeometry);
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.set(0, 0.06, 0);
    scene.add(core);

    // Two lift shafts and a stepped stair bay make the central circulation legible.
    addBox(1.35, 2.2, 1.65, -1.05, 1.15, -0.9, liftMaterial);
    addBox(1.35, 2.2, 1.65, 1.05, 1.15, -0.9, liftMaterial);
    for (let step = 0; step < 7; step++) {
      addBox(
        2.2,
        0.13,
        0.29,
        0,
        0.16 + step * 0.19,
        0.65 + step * 0.28,
        stairMaterial,
      );
    }

    const ceiling = new THREE.Group();
    const ceilingZones: [number, number, number, number][] = [
      [-9.5, 0, 5, 7.6],
      [9.5, 0, 5, 7.6],
      [-5.2, -7, 5.4, 5.5],
      [5.2, -7, 5.4, 5.5],
      [-5.2, 7, 5.4, 5.5],
      [5.2, 7, 5.4, 5.5],
    ];
    ceilingZones.forEach(([x, z, w, d]) => {
      const geometry = new THREE.BoxGeometry(w, 0.07, d);
      geometries.push(geometry);
      const panel = new THREE.Mesh(geometry, ceilingMaterial);
      panel.position.set(x, 2.78, z);
      ceiling.add(panel);
    });
    scene.add(ceiling);
    ceilingRef.current = ceiling;

    // A sample defect marker on the ceiling of an illustrative west-side unit.
    const patchGeometry = new THREE.CircleGeometry(0.8, 32);
    geometries.push(patchGeometry);
    const patch = new THREE.Mesh(patchGeometry, issueMaterial);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(-9.5, 2.84, -1);
    patch.userData.issue = true;
    scene.add(patch);
    const ringGeometry = new THREE.RingGeometry(0.92, 1.06, 32);
    geometries.push(ringGeometry);
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-9.5, 2.86, -1);
    ring.userData.issue = true;
    scene.add(ring);
    const pinGeometry = new THREE.SphereGeometry(0.28, 20, 12);
    geometries.push(pinGeometry);
    const pin = new THREE.Mesh(pinGeometry, issueMaterial);
    pin.position.set(-9.5, 3.3, -1);
    pin.userData.issue = true;
    scene.add(pin);

    const grid = new THREE.GridHelper(34, 17, 0x51717b, 0x36515b);
    grid.position.y = -0.25;
    scene.add(grid);

    const render = () => renderer.render(scene, camera);
    renderRef.current = render;
    controls.addEventListener("change", render);
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const click = (event: MouseEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObjects([pin, ring, patch]).length)
        setIssueOpen(true);
    };
    renderer.domElement.addEventListener("click", click);

    return () => {
      observer.disconnect();
      renderer.domElement.removeEventListener("click", click);
      controls.removeEventListener("change", render);
      controls.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      ceilingRef.current = null;
      resetRef.current = null;
      renderRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (ceilingRef.current) {
      ceilingRef.current.visible = showCeiling;
      renderRef.current?.();
    }
  }, [showCeiling]);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_270px]">
      <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-white/10 bg-[#15232b] sm:min-h-[580px]">
        <div
          ref={mountRef}
          className="absolute inset-0"
          aria-label={t.structure3dTitle}
        />
        {sceneError && (
          <p
            role="alert"
            className="absolute inset-0 grid place-items-center p-6 text-center text-amber-200"
          >
            {t.structure3dError}
          </p>
        )}
        <p className="pointer-events-none absolute bottom-3 left-3 rounded bg-[#101719]/85 px-3 py-2 text-xs text-slate-200">
          {t.structure3dControls}
        </p>
      </div>
      <aside className="space-y-4 rounded-xl border border-white/10 bg-[#18272d] p-4 text-sm">
        <h3 className="text-lg font-semibold text-teal-100">
          {t.structure3dTitle}
        </h3>
        <p className="leading-6 text-slate-300">{t.structure3dExplanation}</p>
        <div className="space-y-1.5 border-t border-white/10 pt-3 text-xs text-slate-300">
          <p>
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#d5e4d6]" />
            {t.structure3dUnits}
          </p>
          <p>
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#397c91]" />
            {t.structure3dService}
          </p>
          <p>
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#e2ad68]" />
            {t.structure3dStairs}
          </p>
        </div>
        <label className="flex items-center gap-2 text-slate-200">
          <input
            type="checkbox"
            checked={showCeiling}
            onChange={(e) => setShowCeiling(e.target.checked)}
            className="accent-teal-400"
          />
          {t.structure3dCeiling}
        </label>
        <button
          type="button"
          onClick={() => resetRef.current?.()}
          className="rounded border border-white/20 px-3 py-2 hover:bg-slate-700"
        >
          {t.structure3dReset}
        </button>
        <button
          type="button"
          onClick={() => setIssueOpen(true)}
          className="block w-full rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-3 text-left text-red-100 hover:bg-red-400/20"
        >
          ● {t.structure3dIssue}
        </button>
        {issueOpen && (
          <div className="rounded-lg border border-red-400/30 bg-[#2e2427] p-3 leading-6 text-slate-200">
            <div className="flex justify-between gap-2">
              <strong className="text-red-200">{t.structure3dIssue}</strong>
              <button
                type="button"
                onClick={() => setIssueOpen(false)}
                aria-label={t.close}
              >
                ✕
              </button>
            </div>
            <p className="mt-2">{t.structure3dIssueDetail}</p>
          </div>
        )}
      </aside>
    </div>
  );
}

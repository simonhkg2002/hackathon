import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { copy, type Language } from "../i18n";
import { categoryNames, locationNames } from "./RepairTickets";
import type {
  DemoTicket,
  ModelPoint,
  TicketLocation,
} from "../services/demoTickets";

type Point = [number, number];
type Callout = { id: string; x: number; y: number; visible: boolean };

const issueAnchors: Record<TicketLocation, [number, number, number]> = {
  unit: [-7.3, 2.3, 2.1],
  corridor: [0, 2.1, -2.6],
  lift: [-1.1, 3.2, -0.9],
  stairs: [0.8, 2.45, 2.1],
  "wet-area": [4.1, 2.3, 5.2],
  ceiling: [0, 3.3, -2.5],
  facade: [11.4, 2.3, -1],
};

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

export function Structure3DView({
  language,
  floor,
  modelPoint,
  onModelPointChange,
  tickets,
}: {
  language: Language;
  floor: number;
  modelPoint: ModelPoint | null;
  onModelPointChange: (point: ModelPoint | null) => void;
  tickets: DemoTicket[];
}) {
  const t = copy[language];
  const mountRef = useRef<HTMLDivElement>(null);
  const ceilingRef = useRef<THREE.Group | null>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const focusIssueRef = useRef<((ticket: DemoTicket) => void) | null>(null);
  const renderRef = useRef<(() => void) | null>(null);
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;
  const selectedPointRef = useRef<THREE.Mesh | null>(null);
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [showCeiling, setShowCeiling] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const activeIssue = tickets.find((ticket) => ticket.id === activeIssueId);
  const selectIssue = (ticket: DemoTicket) => {
    setActiveIssueId(ticket.id);
    focusIssueRef.current?.(ticket);
  };

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
    renderer.setClearColor(0x18242a);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 150);
    camera.position.set(19, 20, 22);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.6, 0);
    controls.minDistance = 9;
    controls.maxDistance = 85;
    controls.maxPolarAngle = Math.PI * 0.37;
    controls.enableDamping = false;
    controls.update();
    controls.saveState();
    resetRef.current = () => {
      controls.reset();
      render();
    };
    focusIssueRef.current = (ticket) => {
      const anchor = issueAnchors[ticket.location];
      const offset = camera.position.clone().sub(controls.target).setLength(20);
      controls.target.set(
        ticket.modelPoint?.x ?? anchor[0],
        0.8,
        ticket.modelPoint?.z ?? anchor[2],
      );
      camera.position.copy(controls.target).add(offset);
      controls.update();
      render();
    };

    scene.add(new THREE.HemisphereLight(0xe9f5f4, 0x52636b, 2.0));
    const sun = new THREE.DirectionalLight(0xfff2dd, 2.5);
    sun.position.set(10, 22, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -26;
    sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 26;
    sun.shadow.camera.bottom = -26;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const material = (color: number, opacity = 1) => {
      const m = new THREE.MeshStandardMaterial({
        color,
        transparent: opacity < 1,
        opacity,
        side: THREE.DoubleSide,
        roughness: 0.86,
        depthWrite: opacity === 1,
      });
      materials.push(m);
      return m;
    };
    const floorMaterial = material(0xcbd3cf);
    const wallMaterial = material(0x9eaba8, 0.88);
    const outerMaterial = material(0xb5c9c4, 0.4);
    const ceilingMaterial = material(0xc2cdca, 0.28);
    const coreMaterial = material(0x6f807d);
    const unitMaterialA = material(0xd8cbb7);
    const unitMaterialB = material(0xcbd2c9);
    const wetAreaMaterial = material(0x98b0b5);
    const liftMaterial = material(0x536773);
    const liftDoorMaterial = material(0x9ba9ac);
    const metalTrimMaterial = material(0x40555e);
    const stairMaterial = material(0xb99569);
    const selectedMaterial = material(0x0ab5ac);
    const pedestalMaterial = material(0x304047);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x667c80,
      transparent: true,
      opacity: 0.64,
    });
    materials.push(edgeMaterial);

    const floorShape = new THREE.Shape();
    outline.forEach(([x, z], index) =>
      index ? floorShape.lineTo(x, z) : floorShape.moveTo(x, z),
    );
    floorShape.closePath();
    const pedestalGeometry = new THREE.ExtrudeGeometry(floorShape, {
      depth: 0.38,
      bevelEnabled: false,
    });
    geometries.push(pedestalGeometry);
    const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
    pedestal.rotation.x = -Math.PI / 2;
    pedestal.position.y = -0.6;
    pedestal.castShadow = true;
    scene.add(pedestal);
    const floorGeometry = new THREE.ExtrudeGeometry(floorShape, {
      depth: 0.22,
      bevelEnabled: false,
    });
    geometries.push(floorGeometry);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.22;
    floor.receiveShadow = true;
    scene.add(floor);
    const selectedGeometry = new THREE.SphereGeometry(0.3, 20, 12);
    geometries.push(selectedGeometry);
    const selectedMarker = new THREE.Mesh(selectedGeometry, selectedMaterial);
    selectedMarker.visible = false;
    scene.add(selectedMarker);
    selectedPointRef.current = selectedMarker;

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
      box.castShadow = true;
      box.receiveShadow = true;
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
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
      const edgesGeometry = new THREE.EdgesGeometry(geometry);
      geometries.push(edgesGeometry);
      const edges = new THREE.LineSegments(edgesGeometry, edgeMaterial);
      edges.position.copy(wall.position);
      edges.rotation.copy(wall.rotation);
      scene.add(edges);
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
    for (const x of [-1.05, 1.05]) {
      addBox(1.2, 1.8, 0.07, x, 1.02, -0.02, liftDoorMaterial);
      addBox(0.035, 1.8, 0.08, x, 1.02, 0.025, metalTrimMaterial);
      addBox(1.28, 0.12, 0.1, x, 2.02, 0.025, metalTrimMaterial);
    }
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
    for (const x of [-1.15, 1.15])
      addBox(0.07, 0.9, 2.25, x, 1.05, 1.55, metalTrimMaterial);

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

    const updateCallouts = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      camera.updateMatrixWorld();
      setCallouts(
        ticketsRef.current.map((ticket, index) => {
          const anchor = issueAnchors[ticket.location];
          const projected = new THREE.Vector3(
            ticket.modelPoint?.x ?? anchor[0],
            anchor[1] + 0.3,
            ticket.modelPoint?.z ?? anchor[2],
          ).project(camera);
          const x = ((projected.x + 1) / 2) * width;
          const y = ((1 - projected.y) / 2) * height;
          return {
            id: ticket.id,
            x: x + (index % 3) * 12,
            y: y - Math.floor(index / 3) * 38,
            visible:
              projected.z < 1 &&
              projected.z > -1 &&
              x > 44 &&
              x < width - 44 &&
              y > 55 &&
              y < height - 44,
          };
        }),
      );
    };
    const render = () => {
      renderer.render(scene, camera);
      updateCallouts();
    };
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
    let pointerStart: [number, number] | null = null;
    const pointerDown = (event: PointerEvent) => {
      pointerStart = [event.clientX, event.clientY];
    };
    const click = (event: MouseEvent) => {
      if (
        pointerStart &&
        Math.hypot(
          event.clientX - pointerStart[0],
          event.clientY - pointerStart[1],
        ) > 5
      )
        return;
      if (event.button !== 0) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const floorHit = raycaster.intersectObject(floor)[0];
      if (floorHit)
        onModelPointChange({
          x: Math.round(floorHit.point.x * 10) / 10,
          z: Math.round(floorHit.point.z * 10) / 10,
        });
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("click", click);

    return () => {
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("click", click);
      controls.removeEventListener("change", render);
      controls.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      ceilingRef.current = null;
      resetRef.current = null;
      focusIssueRef.current = null;
      renderRef.current = null;
      selectedPointRef.current = null;
    };
  }, [language, onModelPointChange]);

  useEffect(() => {
    if (ceilingRef.current) {
      ceilingRef.current.visible = showCeiling;
      renderRef.current?.();
    }
  }, [showCeiling]);

  useEffect(() => {
    renderRef.current?.();
    setActiveIssueId(null);
  }, [tickets, floor, language]);

  useEffect(() => {
    const marker = selectedPointRef.current;
    if (!marker) return;
    marker.visible = Boolean(modelPoint);
    if (modelPoint) marker.position.set(modelPoint.x, 0.45, modelPoint.z);
    renderRef.current?.();
  }, [modelPoint, language]);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_290px]">
      <div className="relative min-h-[460px] overflow-hidden rounded-xl border border-white/10 bg-[#18242a] shadow-2xl shadow-black/30 sm:min-h-[560px]">
        <div
          ref={mountRef}
          className="absolute inset-0"
          aria-label={t.structure3dTitle}
        />
        <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-white/15 bg-[#142127]/90 px-3 py-2 shadow-lg">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-200">
            {t.structure3dConceptBadge}
          </p>
          <p className="mt-0.5 text-xs text-slate-300">
            {floor}
            {t.floorSuffix} · {t.structure3dTitle}
          </p>
        </div>
        {tickets.slice(0, 3).map((ticket, index) => {
          const point = callouts.find((item) => item.id === ticket.id);
          if (!point?.visible) return null;
          return (
            <button
              key={ticket.id}
              type="button"
              onClick={() => selectIssue(ticket)}
              aria-label={`${categoryNames[language][ticket.category]}: ${language === "en" && ticket.sample ? ticket.descriptionEn : ticket.description}`}
              style={{
                left: point.x,
                top: point.y,
                transform: "translate(-50%, -100%)",
              }}
              className={`absolute z-10 flex max-w-44 items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs font-semibold shadow-xl shadow-black/45 transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${activeIssueId === ticket.id ? "border-amber-200 bg-rose-800 text-white" : "border-rose-300/70 bg-[#742d32] text-white"}`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/20 text-[10px]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="truncate">
                {categoryNames[language][ticket.category]}
              </span>
              <span
                aria-hidden="true"
                className="absolute -bottom-2 left-1/2 h-2 w-px bg-rose-200/80"
              />
            </button>
          );
        })}
        {sceneError && (
          <p
            role="alert"
            className="absolute inset-0 grid place-items-center p-6 text-center text-amber-200"
          >
            {t.structure3dError}
          </p>
        )}
        <p className="pointer-events-none absolute bottom-3 left-3 right-3 rounded bg-[#101719]/85 px-3 py-2 text-xs text-slate-200 sm:right-auto">
          {t.structure3dControls}
        </p>
      </div>
      <aside className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#18272d] p-4 text-sm">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300">
            {t.structure3dConceptBadge}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {t.structure3dIssueList} · {floor}
            {t.floorSuffix}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {tickets.length} {t.ticketCountShort}
          </p>
        </div>
        <div className="space-y-2">
          {tickets.length ? (
            tickets.map((ticket, index) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => selectIssue(ticket)}
                className={`w-full rounded-lg border p-3 text-left transition ${activeIssueId === ticket.id ? "border-rose-300 bg-rose-950/60" : "border-white/10 bg-[#111d22] hover:border-rose-300/60"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">
                    {String(index + 1).padStart(2, "0")} ·{" "}
                    {categoryNames[language][ticket.category]}
                  </span>
                  <span className="shrink-0 text-[10px] text-rose-200">
                    {ticket.sample ? t.sampleTicketBadge : t.ticketStatusNew}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-teal-200">
                  {locationNames[language][ticket.location]}
                </span>
                <span className="mt-2 block text-xs leading-5 text-slate-300">
                  {language === "en" && ticket.sample
                    ? ticket.descriptionEn
                    : ticket.description}
                </span>
              </button>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-white/15 bg-[#111d22] p-4 text-xs leading-5 text-slate-400">
              {t.structure3dNoIssues}
            </p>
          )}
        </div>
        {activeIssue && (
          <p role="status" className="text-xs text-amber-200">
            {t.structure3dLocationHint}
          </p>
        )}
        <div className="mt-auto border-t border-white/10 pt-4">
          <p className="text-xs leading-5 text-slate-400">
            {t.structure3dExplanation}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
            <span>
              <i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#d8cbb7]" />
              {t.structure3dUnitLabel}
            </span>
            <span>
              <i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#536773]" />
              {t.structure3dLiftLabel}
            </span>
            <span>
              <i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#b99569]" />
              {t.structure3dStairLabel}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-200">
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
              className="rounded border border-white/20 px-3 py-1.5 text-xs hover:bg-slate-700"
            >
              {t.structure3dReset}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

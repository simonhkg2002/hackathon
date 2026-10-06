import { useCallback, useEffect, useRef, useState } from "react";
import {
  Map,
  Marker,
  NavigationControl,
  type MapMouseEvent,
} from "maplibre-gl";
import { copy, type Language } from "../i18n";
import { applyDarkAppearance } from "../map/appearance";
import {
  mountBuildingRegistry,
  type BuildingInfo,
} from "../map/buildingRegistry";
import { addBuildings } from "../map/buildings";
import { initialCamera, mapConfig } from "../map/config";
import { DEMO_BUILDING_CENTER, isDemoBuilding } from "../map/demoBuilding";
import {
  fetchDistricts,
  type DistrictData,
  type DistrictStat,
} from "../map/districts";
import { identify } from "../services/identify";
import { BuildingPanel } from "./BuildingPanel";
import { AccessCodeDialog } from "./AccessCodeDialog";
import { LayerTwoView } from "./LayerTwoView";
import { IdentifyPanel, type IdentifyState } from "./IdentifyPanel";

type MapError = "mapStartError" | "mapError" | "mapSlow" | "sourceError";

export function DistrictMap() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const demoLinkHandled = useRef(false);
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem("hk-map-language") === "en" ? "en" : "zh",
  );
  const t = copy[language];
  const [districtData, setDistrictData] = useState<DistrictData | null>(null);
  const [districtError, setDistrictError] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictStat | null>(
    null,
  );
  const [building, setBuilding] = useState<BuildingInfo | null>(null);
  const [showLayerTwo, setShowLayerTwo] = useState(false);
  const [registryStatus, setRegistryStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<MapError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [identifyEnabled, setIdentifyEnabled] = useState(false);
  const [selection, setSelection] = useState<IdentifyState | null>(null);
  const [queryAttempt, setQueryAttempt] = useState(0);

  useEffect(() => {
    document.documentElement.lang = language === "en" ? "en" : "zh-Hant";
    document.title = t.appTitle;
    localStorage.setItem("hk-map-language", language);
  }, [language, t.appTitle]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchDistricts(controller.signal)
      .then(setDistrictData)
      .catch(() => {
        if (!controller.signal.aborted) setDistrictError(true);
      });
    return () => controller.abort();
  }, []);

  const openDistrict = useCallback((district: DistrictStat) => {
    const map = mapRef.current;
    setSelectedDistrict(district);
    setBuilding(null);
    setShowLayerTwo(false);
    setSelection(null);
    setRegistryStatus("");
    if (!map) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    map.flyTo({
      center: district.center,
      zoom: 15.2,
      pitch: 35,
      bearing: 0,
      duration: reducedMotion ? 0 : 550,
    });
  }, []);

  const goToDemoBuilding = useCallback(() => {
    const district = districtData?.districts.find(
      (item) => item.nameEn === "Tuen Mun District",
    );
    if (!district) return;
    setSelectedDistrict(district);
    setBuilding(null);
    setShowLayerTwo(false);
    setSelection(null);
    setRegistryStatus("");
    mapRef.current?.flyTo({
      center: DEMO_BUILDING_CENTER,
      zoom: 17,
      pitch: 35,
      bearing: 0,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 700,
    });
  }, [districtData]);

  useEffect(() => {
    if (
      !ready ||
      !districtData ||
      demoLinkHandled.current ||
      new URLSearchParams(window.location.search).get("demo") !== "1"
    )
      return;
    demoLinkHandled.current = true;
    goToDemoBuilding();
    window.history.replaceState({}, "", window.location.pathname);
  }, [ready, districtData, goToDemoBuilding]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !districtData || selectedDistrict || identifyEnabled)
      return;
    const rankedDistricts = [...districtData.districts].sort(
      (a, b) => b.buildings - a.buildings,
    );
    const markers = rankedDistricts.map((district) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "district-badge";
      const number = document.createElement("strong");
      number.textContent = district.buildings.toLocaleString();
      const label = document.createElement("span");
      label.textContent =
        language === "en"
          ? district.nameEn.replace(/ District$/, "")
          : district.name;
      button.append(number, label);
      button.setAttribute(
        "aria-label",
        `${language === "en" ? district.nameEn : district.name}: ${district.buildings} ${t.districtCount}`,
      );
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        openDistrict(district);
      });
      return new Marker({ element: button, anchor: "center" })
        .setLngLat(district.center)
        .addTo(map);
    });
    const updateVisibility = () => {
      const visible = map.getZoom() < 12.5;
      const occupied: { x: number; y: number }[] = [];
      const width = map.getContainer().clientWidth;
      const height = map.getContainer().clientHeight;
      for (const [index, marker] of markers.entries()) {
        const point = map.project(rankedDistricts[index].center);
        const overlaps = occupied.some(
          (other) =>
            Math.abs(point.x - other.x) < 76 &&
            Math.abs(point.y - other.y) < 76,
        );
        const coveredByPanel = point.x < 292 && point.y < 430;
        const inView =
          point.x > 40 &&
          point.x < width - 40 &&
          point.y > 40 &&
          point.y < height - 40;
        const show = visible && inView && !coveredByPanel && !overlaps;
        marker.getElement().style.display = show ? "flex" : "none";
        if (show) occupied.push(point);
      }
    };
    map.on("move", updateVisibility);
    map.on("resize", updateVisibility);
    updateVisibility();
    return () => {
      map.off("move", updateVisibility);
      map.off("resize", updateVisibility);
      for (const marker of markers) marker.remove();
    };
  }, [
    ready,
    districtData,
    selectedDistrict,
    identifyEnabled,
    language,
    t.districtCount,
    openDistrict,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    setBuilding(null);
    setShowLayerTwo(false);
    if (!map || !ready || !selectedDistrict || identifyEnabled) return;
    return mountBuildingRegistry(
      map,
      setRegistryStatus,
      setBuilding,
      selectedDistrict,
      language,
      districtData?.fetchedAt,
    );
  }, [ready, selectedDistrict, identifyEnabled, language, districtData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !identifyEnabled) return;
    map.getCanvas().style.cursor = "crosshair";
    const click = (e: MapMouseEvent) =>
      setSelection({
        coordinate: [e.lngLat.lng, e.lngLat.lat],
        loading: true,
        facilities: [],
      });
    map.on("click", click);
    return () => {
      map.off("click", click);
      map.getCanvas().style.cursor = "";
    };
  }, [ready, identifyEnabled]);

  const longitude = selection?.coordinate[0];
  const latitude = selection?.coordinate[1];
  useEffect(() => {
    if (
      longitude === undefined ||
      latitude === undefined ||
      !mapRef.current ||
      !ready
    )
      return;
    const controller = new AbortController();
    setSelection({
      coordinate: [longitude, latitude],
      loading: true,
      facilities: [],
    });
    const marker = new Marker({ color: "#5eead4" })
      .setLngLat([longitude, latitude])
      .addTo(mapRef.current);
    void identify(longitude, latitude, controller.signal, language)
      .then((facilities) => {
        if (!controller.signal.aborted)
          setSelection({
            coordinate: [longitude, latitude],
            loading: false,
            facilities,
          });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setSelection({
            coordinate: [longitude, latitude],
            loading: false,
            facilities: [],
            error: error instanceof Error ? error.message : t.mapError,
          });
      });
    return () => {
      controller.abort();
      marker.remove();
    };
  }, [longitude, latitude, queryAttempt, ready, language, t.mapError]);

  useEffect(() => {
    if (!container.current) return;
    setLoading(true);
    setReady(false);
    setMessage(null);
    let map: Map;
    try {
      map = new Map({
        container: container.current,
        style: mapConfig.styleUrl,
        ...initialCamera,
        minZoom: 2,
        maxZoom: 20,
        maxPitch: 75,
        canvasContextAttributes: { antialias: true },
        pixelRatio: Math.min(window.devicePixelRatio, 2),
      });
    } catch {
      setLoading(false);
      setMessage("mapStartError");
      return;
    }
    mapRef.current = map;
    map.addControl(
      new NavigationControl({ visualizePitch: true }),
      "top-right",
    );
    map.touchZoomRotate.enableRotation();
    map.touchPitch.enable();
    map
      .getCanvas()
      .setAttribute(
        "aria-label",
        "Interactive map of Hong Kong districts and building repair orders",
      );
    map.on("style.load", () => {
      applyDarkAppearance(map);
      if (!addBuildings(map)) setMessage("sourceError");
    });
    map.on("load", () => {
      setLoading(false);
      setReady(true);
    });
    map.on("error", () => {
      setLoading(false);
      setMessage("mapError");
    });
    const timeout = window.setTimeout(() => {
      if (!map.loaded()) {
        setLoading(false);
        setMessage("mapSlow");
      }
    }, 20000);
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container.current);
    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
      setReady(false);
      mapRef.current = null;
      map.remove();
    };
  }, [attempt]);

  const resetCamera = () => {
    setSelectedDistrict(null);
    setBuilding(null);
    setShowLayerTwo(false);
    setRegistryStatus("");
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    mapRef.current?.setMaxPitch(75);
    mapRef.current?.easeTo({
      ...initialCamera,
      duration: reducedMotion ? 0 : 800,
    });
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#101719] text-slate-100">
      <div ref={container} className="absolute inset-0" />
      <header className="pointer-events-none absolute left-4 top-4 z-10 max-w-[calc(100%-96px)] sm:left-6 sm:top-6">
        <div className="pointer-events-auto rounded-xl border border-white/10 bg-[#101719]/95 px-4 py-3 shadow-xl backdrop-blur-md">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-teal-300">
            Hong Kong
          </p>
          <h1 className="text-lg font-medium">{t.appTitle}</h1>
          <div className="mt-2 flex gap-1 text-xs" aria-label="Language">
            <button
              type="button"
              onClick={() => setLanguage("zh")}
              aria-pressed={language === "zh"}
              className={`rounded px-2 py-1 ${language === "zh" ? "bg-teal-700 text-white" : "text-slate-300 hover:bg-slate-700"}`}
            >
              繁中
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
              className={`rounded px-2 py-1 ${language === "en" ? "bg-teal-700 text-white" : "text-slate-300 hover:bg-slate-700"}`}
            >
              EN
            </button>
          </div>
        </div>
      </header>
      <section
        aria-label={selectedDistrict ? t.buildingInfo : t.chooseDistrict}
        className="absolute left-4 top-36 z-10 max-h-[calc(100dvh-205px)] w-[min(260px,calc(100%-32px))] overflow-y-auto rounded-xl border border-white/10 bg-[#101719]/95 p-4 shadow-xl backdrop-blur-md sm:left-6"
      >
        {selectedDistrict ? (
          <>
            <button
              type="button"
              onClick={resetCamera}
              className="mb-3 rounded px-2 py-1 text-sm text-teal-300 hover:bg-slate-700"
            >
              ← {t.back}
            </button>
            <h2 className="text-xl font-medium">
              {language === "en"
                ? selectedDistrict.nameEn
                : selectedDistrict.name}
            </h2>
            <p className="mt-3 text-3xl font-semibold text-rose-300">
              {selectedDistrict.buildings.toLocaleString()}
            </p>
            <p className="text-sm text-slate-300">{t.districtCount}</p>
            <p className="mt-2 text-xs text-slate-400">
              {t.issuedOrders}: {selectedDistrict.orders.toLocaleString()}
            </p>
            <p className="mt-4 text-xs leading-5 text-slate-400">
              {t.districtHint}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {selectedDistrict.buildings ? t.currentView : t.noDistrictRecords}
            </p>
            {selectedDistrict.buildings > 0 && (
              <p role="status" className="mt-3 text-xs text-teal-200">
                {registryStatus || t.viewDetails}
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="text-sm font-medium text-teal-200">
              {t.chooseDistrict}
            </h2>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {t.districtHint}
            </p>
            <p className="mt-2 text-[11px] leading-4 text-slate-500">
              {t.districtListHint}
            </p>
            {districtError && (
              <p role="alert" className="mt-3 text-amber-200">
                {t.districtLoadError}
              </p>
            )}
            {districtData && (
              <details className="mt-3 border-t border-white/10 pt-3 text-sm">
                <summary className="cursor-pointer text-slate-200">
                  18 {language === "en" ? "districts" : "區排名"} ·{" "}
                  {districtData.totalBuildings.toLocaleString()}{" "}
                  {t.districtCount}
                </summary>
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                  {[...districtData.districts]
                    .sort((a, b) => b.buildings - a.buildings)
                    .map((district) => (
                      <button
                        key={district.name}
                        type="button"
                        onClick={() => openDistrict(district)}
                        className="flex w-full justify-between rounded px-2 py-1 text-left hover:bg-slate-700"
                      >
                        <span>
                          {language === "en"
                            ? district.nameEn.replace(/ District$/, "")
                            : district.name}
                        </span>
                        <span className="ml-3 text-rose-300">
                          {district.buildings}
                        </span>
                      </button>
                    ))}
                </div>
              </details>
            )}
          </>
        )}
        <label className="mt-4 flex cursor-pointer items-center gap-2 border-t border-white/10 pt-3 text-xs">
          <input
            type="checkbox"
            checked={identifyEnabled}
            onChange={(e) => {
              setIdentifyEnabled(e.target.checked);
              if (!e.target.checked) setSelection(null);
            }}
            className="accent-teal-300"
          />
          {t.identify}
        </label>
        {identifyEnabled && (
          <p className="mt-2 text-xs text-slate-400">{t.identifyHint}</p>
        )}
        {districtData && (
          <button
            type="button"
            onClick={goToDemoBuilding}
            className="mt-4 w-full rounded-lg border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-left text-xs font-semibold text-amber-100 hover:bg-amber-300/20"
          >
            ★ {t.findDemoBuilding}
          </button>
        )}
        <p className="mt-3 text-[10px] leading-4 text-slate-500">
          {t.districtSource}
        </p>
      </section>
      {building && !identifyEnabled && !showLayerTwo && (
        <BuildingPanel
          building={building}
          language={language}
          onClose={() => setBuilding(null)}
        />
      )}
      {building &&
        !identifyEnabled &&
        !showLayerTwo &&
        isDemoBuilding(building) && (
          <AccessCodeDialog
            language={language}
            onClose={() => setBuilding(null)}
            onContinue={() => setShowLayerTwo(true)}
          />
        )}
      {showLayerTwo && building && isDemoBuilding(building) && (
        <LayerTwoView
          language={language}
          onClose={() => {
            setShowLayerTwo(false);
            setBuilding(null);
          }}
        />
      )}
      {selection && (
        <IdentifyPanel
          state={selection}
          language={language}
          onClose={() => setSelection(null)}
          onRetry={() => setQueryAttempt((n) => n + 1)}
        />
      )}
      <button
        type="button"
        onClick={resetCamera}
        disabled={loading}
        title={t.reset}
        aria-label={t.reset}
        className="absolute right-[10px] top-[116px] z-10 flex h-10 w-10 items-center justify-center rounded-md border border-white/15 bg-[#182126] text-slate-100 shadow-lg transition hover:bg-slate-700 disabled:opacity-40"
      >
        ⌂
      </button>
      <p className="pointer-events-none absolute bottom-6 left-6 z-10 hidden rounded-md bg-[#101719]/85 px-3 py-2 text-[11px] text-slate-300 sm:block">
        {t.mapHelp}
      </p>
      {loading && (
        <p
          role="status"
          className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-[#101719]/95 px-4 py-3 text-sm"
        >
          {t.loadingMap}
        </p>
      )}
      {message && (
        <div
          role="alert"
          className="absolute bottom-16 left-1/2 z-10 w-[calc(100%-40px)] max-w-md -translate-x-1/2 rounded-xl border border-amber-300/25 bg-[#182126] p-4 text-sm"
        >
          <p>{t[message]}</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="mt-3 rounded bg-slate-700 px-3 py-1.5"
          >
            {t.retry}
          </button>
        </div>
      )}
    </main>
  );
}

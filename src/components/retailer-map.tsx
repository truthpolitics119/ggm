"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LatLngBoundsExpression, Map as LeafletMap, Marker } from "leaflet";
import { getEffectiveStatus, type Retailer } from "@/lib/types";
import { currency } from "@/lib/format";

type LeafletModules = typeof import("leaflet");
type ClusterLayer = import("leaflet").LayerGroup;

const esri = "https://server.arcgisonline.com/ArcGIS/rest/services/";

export default function RetailerMap({ retailers }: { retailers: Retailer[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const groupRef = useRef<ClusterLayer | null>(null);
  const [modules, setModules] = useState<LeafletModules | null>(null);
  const [status, setStatus] = useState("all");
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("balance");
  const [basemap, setBasemap] = useState("dark");
  const [cluster, setCluster] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const leaflet = await import("leaflet");
        await import("leaflet.markercluster");
        if (alive) setModules(leaflet);
      } catch (error) {
        if (alive) setMapError(error instanceof Error ? error.message : "The map could not be loaded.");
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!modules || !containerRef.current || mapRef.current) return;
    const map = modules.map(containerRef.current, { zoomControl: false, minZoom: 5, maxZoom: 19 }).setView([42.2, 12.6], 6);
    modules.control.zoom({ position: "topright" }).addTo(map);
    mapRef.current = map;
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    resizeObserver.observe(containerRef.current);
    setMapReady(true);
    return () => { resizeObserver.disconnect(); map.remove(); mapRef.current = null; setMapReady(false); };
  }, [modules]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return retailers.filter((r) =>
      (status === "all" || getEffectiveStatus(r) === status) &&
      (!city || r.city === city) &&
      (!q || [r.name, r.username, r.city, r.customer_id, r.street].some((v) => String(v ?? "").toLocaleLowerCase().includes(q))),
    ).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "city" ? (a.city ?? "").localeCompare(b.city ?? "") : Number(b.balance)-Number(a.balance));
  }, [retailers, status, city, query, sort]);

  useEffect(() => {
    if (!modules || !mapReady || !mapRef.current) return;
    const L = modules;
    const map = mapRef.current;
    const esriTile = (path: string, attribution: string, maxNativeZoom = 19) => L.tileLayer(`${esri}${path}/MapServer/tile/{z}/{y}/{x}`, { attribution, maxZoom: 19, maxNativeZoom });
    const attr = "Tiles © Esri";
    const tileLayer = basemap === "satellite"
      ? L.layerGroup([esriTile("World_Imagery", `${attr}, Maxar, Earthstar Geographics`), esriTile("Reference/World_Boundaries_and_Places", attr)])
      : basemap === "streets"
        ? L.layerGroup([esriTile("World_Street_Map", attr)])
        : L.layerGroup([esriTile("Canvas/World_Dark_Gray_Base", attr, 16), esriTile("Canvas/World_Dark_Gray_Reference", attr, 16)]);
    tileLayer.addTo(map);
    return () => { map.removeLayer(tileLayer); };
  }, [modules, basemap, mapReady]);

  useEffect(() => {
    if (!modules || !mapReady || !mapRef.current) return;
    const L = modules;
    const map = mapRef.current;
    if (groupRef.current) map.removeLayer(groupRef.current);
    const mk = new Map<string, Marker>();
    const markers = filtered.map((r) => {
      const effectiveStatus = getEffectiveStatus(r);
      const color = effectiveStatus === "active" ? "#e6c45a" : "#8d7540";
      const marker = L.marker([r.latitude!, r.longitude!], {
        icon: L.divIcon({
          className: "rp-wrap", iconSize: [34, 44], iconAnchor: [17, 44], popupAnchor: [0, -40],
          html: `<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 1.5c-7.5 0-13.5 5.9-13.5 13.2C3.5 26 17 42.5 17 42.5S30.5 26 30.5 14.7C30.5 7.4 24.5 1.5 17 1.5z" fill="#0b0b0a" stroke="${color}" stroke-width="2.2"/><g transform="translate(17 15.5)" fill="${color}"><path d="M-8.4-3.6h16.8l-1.3 3.1a2.1 2.1 0 0 1-1.9 1.2h-10.4a2.1 2.1 0 0 1-1.9-1.2z"/><path d="M-7 1.2h14v8.6a1.2 1.2 0 0 1-1.2 1.2h-11.6A1.2 1.2 0 0 1-7 9.8z"/><path d="M-2.4 4.4h4.8v6.6h-4.8z" fill="#0b0b0a"/></g></svg>`,
        }),
      });
      const popup = document.createElement("div");
      const title = document.createElement("h3"); title.textContent = r.name; popup.append(title);
      const username = document.createElement("div"); username.textContent = r.username ?? ""; username.className = "small"; popup.append(username);
      const badge = document.createElement("div"); badge.className = `status-badge ${effectiveStatus}`; badge.textContent = effectiveStatus; popup.append(badge);
      const list = document.createElement("dl");
      const address = [r.street, r.house_number].filter(Boolean).join(" ");
      const location = [r.postal_code, r.city].filter(Boolean).join(" ");
      [[ "Balance", currency(r.balance) ], [ "Customer ID", String(r.customer_id) ], [ "Address", address || "—" ],
        [ "City", location || "—" ], [ "Mobile", r.mobile || "—" ], [ "Location", "Mapped location" ]].forEach(([label, value]) => {
          const term = document.createElement("dt"); term.textContent = label;
          const description = document.createElement("dd"); description.textContent = value;
          list.append(term, description);
        });
      popup.append(list);
      const link = document.createElement("a"); link.href = `/retailers/${r.id}`; link.textContent = "View retailer details →"; popup.append(link);
      marker.bindPopup(popup, { minWidth: 220 });
      mk.set(r.id, marker);
      return marker;
    });
    markersRef.current = mk;
    const group = cluster ? L.markerClusterGroup({
      showCoverageOnHover: false,
      iconCreateFunction: (clusterGroup) => {
        const count = clusterGroup.getChildCount();
        return L.divIcon({ html: `<div style="background:#11100d;color:#f1d36b;border:2px solid #d4af37;border-radius:50%;width:42px;height:42px;display:grid;place-items:center;font-weight:700">${count}</div>`, className: "marker-cluster-custom", iconSize: [42, 42] });
      },
    }) : L.layerGroup();
    markers.forEach((marker) => group.addLayer(marker));
    group.addTo(map);
    groupRef.current = group;
    return () => { if (map.hasLayer(group)) map.removeLayer(group); };
  }, [modules, mapReady, filtered, cluster]);

  const cities = useMemo(() => {
    const counts = new Map<string, { total: number; active: number }>();
    retailers.filter((r) => status === "all" || getEffectiveStatus(r) === status).forEach((r) => {
      const name = r.city ?? "Unspecified";
      const item = counts.get(name) ?? { total: 0, active: 0 };
      item.total++; if (getEffectiveStatus(r) === "active") item.active++;
      counts.set(name, item);
    });
    return Array.from(counts, ([name, value]) => ({ name, ...value })).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [retailers, status]);

  function fitResults() {
    const map = mapRef.current;
    if (!map || !filtered.length) return;
    const bounds: LatLngBoundsExpression = filtered.map((r) => [r.latitude!, r.longitude!]);
    map.fitBounds(bounds, { padding: [35, 35], maxZoom: filtered.length === 1 ? 14 : undefined });
  }
  function flyTo(r: Retailer) {
    const point = { lat: r.latitude!, lng: r.longitude! };
    mapRef.current?.flyTo([point.lat, point.lng], Math.max(14, mapRef.current.getZoom()), { duration: 0.7 });
    const marker = markersRef.current.get(r.id);
    if (marker && groupRef.current && "zoomToShowLayer" in groupRef.current) {
      (groupRef.current as ClusterLayer & { zoomToShowLayer: (marker: Marker, callback: () => void) => void }).zoomToShowLayer(marker, () => marker.openPopup());
    } else marker?.openPopup();
  }

  return <div className="map-frame">
    <aside className="map-rail">
      <div className="map-controls">
        <input className="input map-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, username, city…" aria-label="Search retailers"/>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <select className="select" value={city} onChange={(e) => setCity(e.target.value)} aria-label="Filter city"><option value="">All cities</option>{Array.from(new Set(retailers.map((r) => r.city).filter(Boolean))).sort().map((name) => <option key={name} value={name!}>{name}</option>)}</select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort retailers"><option value="balance">Highest balance</option><option value="name">Name A–Z</option><option value="city">City A–Z</option></select>
        <label className="row small map-muted"><input type="checkbox" checked={cluster} onChange={(e) => setCluster(e.target.checked)}/> Group nearby retailers</label>
        <div className="row-between small map-gold"><strong>Top cities</strong><span>{filtered.length} shown</span></div>
        {cities.map((c) => <button key={c.name} className="row-between small map-city" onClick={() => setCity(city === c.name ? "" : c.name)}>
          <span className="map-city-name">{c.name}</span><span className="map-city-track"><i style={{width:`${c.total ? c.active / c.total * 100 : 0}%`}}/></span><span className="map-city-count">{c.total}</span>
        </button>)}
      </div>
      <div className="map-list">{filtered.length ? filtered.map((r) => <button className="map-row" key={r.id} onClick={() => flyTo(r)}>
        <i className={`status-dot ${getEffectiveStatus(r) === "active" ? "map-active" : "map-inactive"}`}/>
        <span className="map-retailer-name"><strong>{r.name}</strong><span className="small map-muted">{r.username} · {r.city}</span></span>
        <span className="small" style={{whiteSpace:"nowrap"}}>{currency(r.balance)}</span>
      </button>) : <div className="empty-state">No retailers match these filters.</div>}</div>
    </aside>
    <div className="map-canvas" style={{position:"relative",minWidth:0,minHeight:0}}>
      {mapError && <div className="error-box">{mapError}</div>}
      <div ref={containerRef} id="retailer-map" role="application" aria-label="Retailer map" style={{position:"absolute",inset:0,background:"#0c0c0a"}}/>
      <div className="map-panel" role="group" aria-label="Basemap">{[["dark","Dark"],["satellite","Satellite"],["streets","Streets"]].map(([id,label])=><button className={basemap === id ? "selected" : ""} aria-pressed={basemap === id} key={id} onClick={() => setBasemap(id)}>{label}</button>)}</div>
      <button className="map-panel map-fit" onClick={fitResults}>Fit to results</button>
      <div className="map-legend"><div><i className="status-dot map-active"/>Active</div><div><i className="status-dot map-inactive"/>Inactive</div></div>
      {!retailers.length && <div className="map-panel" style={{top:68}}>No geocoded retailers have been imported.</div>}
    </div>
  </div>;
}

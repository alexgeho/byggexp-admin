'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Spin } from 'antd';
import { EnvironmentOutlined, ReloadOutlined } from '@ant-design/icons';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import { useT } from '@/src/i18n/LanguageProvider';
import { useAuthStore } from '@/src/store/authStore';
import { getEntityId } from '@/src/utils/entityId';
import './SiteMapPage.scss';

// Approach A live map: project SITES (by their saved address coordinates) with a
// live count of workers currently on site — derived from each user's workStatus,
// NOT from stored worker coordinates. This keeps our privacy promise intact
// (we never persist worker positions) while still giving admins an at-a-glance
// "who's where right now" board. Data refreshes on an interval so it stays live.

const FALLBACK_CENTER = [59.3293, 18.0686]; // Stockholm
const FALLBACK_ZOOM = 5;
const REFRESH_MS = 30000;

const idOf = (v) => (v && typeof v === 'object' ? getEntityId(v) : v);
const sameId = (a, b) => a != null && b != null && String(idOf(a)) === String(idOf(b));
const isActiveProject = (p) => !['completed', 'done'].includes(String(p.status || '').toLowerCase());
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export default function SiteMapPage() {
  const t = useT();
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const LRef = useRef(null);
  const layerRef = useRef(null);
  const fittedRef = useRef(false);

  const load = ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    const companyId = user?.companyId;
    const usersReq = isSuperAdmin || !companyId
      ? apiClient.get('/users')
      : apiClient.get(`/users/company/${companyId}`);
    const projectsReq = isSuperAdmin || !companyId
      ? apiClient.get('/projects')
      : apiClient.get(`/projects/company/${companyId}`);
    Promise.all([
      projectsReq.then((r) => r.data).catch(() => []),
      usersReq.then((r) => r.data).catch(() => []),
    ]).then(([pr, us]) => {
      setProjects(Array.isArray(pr) ? pr : []);
      setUsers(Array.isArray(us) ? us : []);
      setLoading(false);
    });
  };

  useEffect(load, [user, isSuperAdmin]);

  // Poll so the on-site counts stay live without a manual refresh.
  useEffect(() => {
    const id = setInterval(() => load({ silent: true }), REFRESH_MS);
    return () => clearInterval(id);
  }, [user, isSuperAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-project on-site workers: users reporting workStatus 'working' whose
  // current work project is this one.
  const sites = useMemo(() => {
    const active = projects.filter(isActiveProject);
    const working = users.filter((u) => u.workStatus === 'working');
    return active.map((p) => {
      const pid = getEntityId(p);
      const onSite = working.filter((u) => sameId(u.workStatusProjectId, pid));
      const lat = Number(p.locationLatitude);
      const lng = Number(p.locationLongitude);
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
      return {
        id: pid,
        name: p.name || p.location || t('Untitled project'),
        address: p.location || '',
        lat,
        lng,
        hasCoords,
        onSite,
        count: onSite.length,
      };
    });
  }, [projects, users, t]);

  const located = useMemo(() => sites.filter((s) => s.hasCoords), [sites]);
  const unlocated = useMemo(() => sites.filter((s) => !s.hasCoords), [sites]);
  const totalOnSite = useMemo(() => sites.reduce((n, s) => n + s.count, 0), [sites]);
  const activeSites = useMemo(() => sites.filter((s) => s.count > 0).length, [sites]);

  // Create the Leaflet map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import('leaflet');
      const L = mod.default ?? mod;
      if (cancelled || !mapElRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(mapElRef.current, {
        center: FALLBACK_CENTER,
        zoom: FALLBACK_ZOOM,
        zoomControl: true,
      });
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      [0, 200, 500].forEach((d) => setTimeout(() => {
        if (!cancelled && mapRef.current) mapRef.current.invalidateSize();
      }, d));
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Redraw markers whenever the site data changes.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();

    located.forEach((s) => {
      const active = s.count > 0;
      const icon = L.divIcon({
        className: 'sitemap__pin-wrap',
        html: `<div class="sitemap__pin${active ? ' sitemap__pin--active' : ''}"><span>${s.count}</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const names = s.onSite.map((u) => `<li>${escapeHtml(u.name || t('Unnamed'))}</li>`).join('');
      const popup = `
        <div class="sitemap__popup">
          <div class="sitemap__popup-name">${escapeHtml(s.name)}</div>
          ${s.address ? `<div class="sitemap__popup-addr">${escapeHtml(s.address)}</div>` : ''}
          <div class="sitemap__popup-count">${escapeHtml(t('{n} on site').replace('{n}', String(s.count)))}</div>
          ${names ? `<ul class="sitemap__popup-list">${names}</ul>` : ''}
        </div>`;
      L.marker([s.lat, s.lng], { icon }).addTo(layer).bindPopup(popup);
    });

    // Fit to all located sites once, on first data arrival.
    if (!fittedRef.current && located.length) {
      const bounds = L.latLngBounds(located.map((s) => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
      fittedRef.current = true;
    }
  }, [located, t]);

  const focusSite = (s) => {
    const map = mapRef.current;
    if (!map || !s.hasCoords) return;
    map.setView([s.lat, s.lng], 15, { animate: true });
  };

  return (
    <div className="sitemap">
      <header className="sitemap__head">
        <div>
          <h1 className="sitemap__title">{t('Site map')}</h1>
          <p className="sitemap__sub">
            {t('Live count of workers on site, by project. Worker positions are never stored.')}
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => load()}>{t('Refresh')}</Button>
      </header>

      <div className="sitemap__summary">
        <span className="sitemap__stat"><b>{totalOnSite}</b> {t('workers on site')}</span>
        <span className="sitemap__stat-sep">·</span>
        <span className="sitemap__stat"><b>{activeSites}</b> {t('active sites')}</span>
      </div>

      <div className="sitemap__body">
        <aside className="sitemap__list">
          {loading && !sites.length ? (
            <div className="sitemap__spin"><Spin /></div>
          ) : (
            <>
              {located.length ? located
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`sitemap__row${s.count > 0 ? ' sitemap__row--active' : ''}`}
                    onClick={() => focusSite(s)}
                  >
                    <span className={`sitemap__badge${s.count > 0 ? ' sitemap__badge--active' : ''}`}>
                      {s.count}
                    </span>
                    <span className="sitemap__row-body">
                      <span className="sitemap__row-name">{s.name}</span>
                      {s.address ? <span className="sitemap__row-addr">{s.address}</span> : null}
                    </span>
                  </button>
                )) : (
                  <div className="sitemap__empty">
                    {t('No projects with a saved location yet.')}
                  </div>
                )}

              {unlocated.length ? (
                <div className="sitemap__unlocated">
                  <div className="sitemap__unlocated-head">
                    <EnvironmentOutlined /> {t('No location set')}
                  </div>
                  {unlocated.map((s) => (
                    <div key={s.id} className="sitemap__unlocated-row">
                      <span className={`sitemap__badge${s.count > 0 ? ' sitemap__badge--active' : ''}`}>
                        {s.count}
                      </span>
                      <span className="sitemap__row-name">{s.name}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </aside>

        <div className="sitemap__map" ref={mapElRef} />
      </div>
    </div>
  );
}

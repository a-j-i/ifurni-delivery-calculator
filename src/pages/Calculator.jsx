import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBox } from '@mapbox/search-js-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Coordinates never change — these are geographic facts
const WAREHOUSE_COORDS = {
  seaford:      { id: 'seaford',      name: 'Seaford',      lat: -38.1077, lng: 145.1694 },
  auckland:     { id: 'auckland',     name: 'Auckland',     lat: -36.8485, lng: 174.7633 },
  christchurch: { id: 'christchurch', name: 'Christchurch', lat: -43.5321, lng: 172.6362 },
};

// Fallback pricing if nothing is saved yet
const PRICING_DEFAULTS = {
  seaford:      { flatFee: 80,  flatRateKm: 10, perKmRate: 3.0 },
  auckland:     { flatFee: 60,  flatRateKm: 10, perKmRate: 3.0 },
  christchurch: { flatFee: 55,  flatRateKm: 10, perKmRate: 2.8 },
};

function loadWarehouses() {
  try {
    const cached = localStorage.getItem('warehouseSettings');
    if (cached) {
      const settings = JSON.parse(cached);
      return Object.keys(WAREHOUSE_COORDS).map(id => ({
        ...WAREHOUSE_COORDS[id],
        ...PRICING_DEFAULTS[id],
        ...settings[id],
      }));
    }
  } catch {
    // ignore parse errors, fall back to defaults
  }
  return Object.keys(WAREHOUSE_COORDS).map(id => ({
    ...WAREHOUSE_COORDS[id],
    ...PRICING_DEFAULTS[id],
  }));
}

export default function Calculator() {
  const navigate = useNavigate();

  const [warehouses, setWarehouses]   = useState(loadWarehouses);
  const [warehouse, setWarehouse]     = useState(() => loadWarehouses()[0]);
  const [destination, setDestination]       = useState(null);
  const [addressText, setAddressText]       = useState('');
  const [searchKey, setSearchKey]           = useState(0);
  const [result, setResult]                 = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  // On every mount: show localStorage instantly, then fetch Firestore in the
  // background and update if anything changed (covers cross-device updates)
  useEffect(() => {
    const WAREHOUSE_IDS = ['seaford', 'auckland', 'christchurch'];
    Promise.all(WAREHOUSE_IDS.map(id => getDoc(doc(db, 'warehouses', id))))
      .then(docs => {
        const settings = {};
        docs.forEach((snap, i) => {
          const id = WAREHOUSE_IDS[i];
          if (snap.exists()) settings[id] = snap.data();
        });
        localStorage.setItem('warehouseSettings', JSON.stringify(settings));
        const fresh = loadWarehouses();
        setWarehouses(fresh);
        setWarehouse(prev => fresh.find(w => w.id === prev.id) ?? fresh[0]);
      })
      .catch(() => {}); // stay on cached/default values silently if offline
  }, []);

  // Reload from localStorage when returning from Settings page
  useEffect(() => {
    const onFocus = () => {
      const fresh = loadWarehouses();
      setWarehouses(fresh);
      setWarehouse(prev => fresh.find(w => w.id === prev.id) ?? fresh[0]);
      setResult(null);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  async function handleCalculate() {
    document.activeElement?.blur(); // dismiss keyboard and zoom back out on mobile
    if (!destination) {
      setError('Please enter a delivery address.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${warehouse.lng},${warehouse.lat};${destination.lng},${destination.lat}` +
        `?access_token=${MAPBOX_TOKEN}&overview=false`;

      const res  = await fetch(url);
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No route found. Try a different address.');
      }

      const distanceKm  = data.routes[0].distance / 1000;
      const isFlat      = distanceKm <= warehouse.flatRateKm;
      const extraKm     = isFlat ? 0 : distanceKm - warehouse.flatRateKm;
      const extraFee    = extraKm * warehouse.perKmRate;
      const total       = warehouse.flatFee + extraFee;

      setResult({
        distanceKm,
        isFlat,
        extraKm,
        extraFee,
        flatFee:    warehouse.flatFee,
        flatRateKm: warehouse.flatRateKm,
        perKmRate:  warehouse.perKmRate,
        total,
      });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setDestination(null);
    setAddressText('');
    setResult(null);
    setError(null);
    setSearchKey(k => k + 1);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Delivery Calculator</h1>
        <button
          onClick={() => navigate('/settings')}
          className="text-sm font-medium text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          Settings
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-5 pt-6">

        {/* Warehouse */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
          <select
            value={warehouse.id}
            onChange={e => {
              setWarehouse(warehouses.find(w => w.id === e.target.value));
              setResult(null);
            }}
            className="input"
          >
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        {/* Address autocomplete */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
          <SearchBox
            key={searchKey}
            accessToken={MAPBOX_TOKEN}
            value={addressText}
            onChange={v => setAddressText(v)}
            onRetrieve={res => {
              const feature = res.features[0];
              const [lng, lat] = feature.geometry.coordinates;
              const full = feature.properties.full_address ?? feature.properties.place_name ?? '';
              setDestination({ lat, lng });
              setAddressText(full);
              setResult(null);
              setError(null);
            }}
            options={{ language: 'en', country: 'NZ,AU' }}
            placeholder="Start typing an address…"
            theme={{
              variables: {
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontFamily: 'inherit',
                unit: '14px',
                padding: '8px 12px',
                boxShadow: 'none',
              },
            }}
          />
        </div>

        {/* Error */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCalculate}
            disabled={loading || !destination}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Calculating…' : 'Calculate'}
          </button>

          {(destination || result) && (
            <button
              onClick={handleClear}
              className="px-5 py-3 border border-gray-300 rounded-lg text-gray-600
                         hover:bg-gray-100 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Result card */}
        {result && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
            <h2 className="font-semibold text-gray-800">Delivery Quote</h2>

            <div className="space-y-2 text-sm">
              <Row label="Distance" value={`${result.distanceKm.toFixed(1)} km`} />
              <Row
                label={`Flat rate (0–${result.flatRateKm} km)`}
                value={`$${result.flatFee.toFixed(2)}`}
              />
              {!result.isFlat && (
                <Row
                  label={`Extra distance (${result.extraKm.toFixed(1)} km × $${result.perKmRate})`}
                  value={`$${result.extraFee.toFixed(2)}`}
                />
              )}
            </div>

            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="font-semibold text-gray-800">Total</span>
              <span className="text-xl font-bold text-blue-600">
                ${result.total.toFixed(2)}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { SearchBox } from '@mapbox/search-js-react';
import { db } from '../firebase';

const CORRECT_PIN   = import.meta.env.VITE_SETTINGS_PIN;
const MAPBOX_TOKEN  = import.meta.env.VITE_MAPBOX_TOKEN;

const WAREHOUSE_IDS = ['seaford', 'auckland', 'christchurch'];

// Hardcoded coords are the fallback — overwritten once admin sets a real address
const DEFAULTS = {
  seaford:      { name: 'Seaford',      address: '', lat: -38.1077, lng: 145.1694, flatFee: 80, flatRateKm: 10, perKmRate: 3.0 },
  auckland:     { name: 'Auckland',     address: '', lat: -36.8485, lng: 174.7633, flatFee: 60, flatRateKm: 10, perKmRate: 3.0 },
  christchurch: { name: 'Christchurch', address: '', lat: -43.5321, lng: 172.6362, flatFee: 55, flatRateKm: 10, perKmRate: 2.8 },
};

export default function Settings() {
  const navigate = useNavigate();

  const [pin, setPinValue]      = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);

  const [form, setForm]           = useState(DEFAULTS);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Load settings on unlock — localStorage first, then Firestore
  useEffect(() => {
    if (!unlocked) return;

    const cached = localStorage.getItem('warehouseSettings');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Merge with DEFAULTS so lat/lng are always present
        const merged = {};
        WAREHOUSE_IDS.forEach(id => {
          merged[id] = { ...DEFAULTS[id], ...parsed[id] };
        });
        setForm(merged);
      } catch {}
    }

    Promise.all(WAREHOUSE_IDS.map(id => getDoc(doc(db, 'warehouses', id))))
      .then(docs => {
        const fresh = {};
        docs.forEach((snap, i) => {
          const id = WAREHOUSE_IDS[i];
          fresh[id] = { ...DEFAULTS[id], ...(snap.exists() ? snap.data() : {}) };
        });
        setForm(fresh);
        localStorage.setItem('warehouseSettings', JSON.stringify(fresh));
      })
      .catch(() => setLoadError('Could not load from server. Showing cached values.'));
  }, [unlocked]);

  function handlePinSubmit(e) {
    e.preventDefault();
    if (pin === CORRECT_PIN) {
      setUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinValue('');
    }
  }

  function handleField(warehouseId, field, value) {
    setForm(prev => ({
      ...prev,
      [warehouseId]: { ...prev[warehouseId], [field]: value },
    }));
    setSaved(false);
  }

  // Called when admin picks a new address from SearchBox — updates address + coords together
  function handleAddressSelect(warehouseId, { address, lat, lng }) {
    setForm(prev => ({
      ...prev,
      [warehouseId]: { ...prev[warehouseId], address, lat, lng },
    }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const parsed = {};
      WAREHOUSE_IDS.forEach(id => {
        parsed[id] = {
          ...form[id],
          flatFee:    parseFloat(form[id].flatFee)    || 0,
          flatRateKm: parseFloat(form[id].flatRateKm) || 0,
          perKmRate:  parseFloat(form[id].perKmRate)  || 0,
          lat:        form[id].lat,
          lng:        form[id].lng,
        };
      });

      await Promise.all(
        WAREHOUSE_IDS.map(id => setDoc(doc(db, 'warehouses', id), parsed[id]))
      );

      localStorage.setItem('warehouseSettings', JSON.stringify(parsed));
      setForm(parsed);
      setSaved(true);
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ─── PIN gate ───────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
          <h1 className="text-xl font-semibold text-gray-800 mb-1 text-center">Settings</h1>
          <p className="text-sm text-gray-500 text-center mb-6">Enter your PIN to continue</p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => { setPinValue(e.target.value); setPinError(false); }}
              placeholder="••••"
              className="input text-center text-2xl tracking-widest"
              autoFocus
            />
            {pinError && (
              <p className="text-sm text-red-600 text-center">Incorrect PIN. Try again.</p>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Unlock
            </button>
          </form>

          <button
            onClick={() => navigate('/')}
            className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 text-center"
          >
            ← Back to Calculator
          </button>
        </div>
      </div>
    );
  }

  // ─── Settings form ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
          ← Back
        </button>
        <h1 className="text-xl font-semibold text-gray-800">Settings</h1>
      </div>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6 pt-6">

        {loadError && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {loadError}
          </p>
        )}

        {WAREHOUSE_IDS.map(id => (
          <WarehouseCard
            key={id}
            data={form[id]}
            onChange={(field, value) => handleField(id, field, value)}
            onAddressSelect={coords => handleAddressSelect(id, coords)}
          />
        ))}

        <div className="flex items-center gap-3 pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save All'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Saved ✓</span>}
        </div>

      </div>
    </div>
  );
}

function WarehouseCard({ data, onChange, onAddressSelect }) {
  const [searchKey, setSearchKey] = useState(0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
      <h2 className="font-semibold text-gray-800">{data.name}</h2>

      {/* Address */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Warehouse Address
        </label>

        {/* Show current saved address */}
        {data.address ? (
          <p className="text-sm text-gray-700 mb-2 px-1">{data.address}</p>
        ) : (
          <p className="text-sm text-gray-400 mb-2 px-1 italic">No address set</p>
        )}

        {/* SearchBox to change address */}
        <SearchBox
          key={searchKey}
          accessToken={MAPBOX_TOKEN}
          onRetrieve={res => {
            const feature = res.features[0];
            const [lng, lat] = feature.geometry.coordinates;
            const address = feature.properties.full_address;
            onAddressSelect({ address, lat, lng });
            setSearchKey(k => k + 1); // reset SearchBox after selection
          }}
          options={{ language: 'en', country: 'NZ,AU' }}
          placeholder={data.address ? 'Search to update address…' : 'Search for address…'}
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

      {/* Pricing fields */}
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Flat Fee ($)"
          value={data.flatFee}
          onChange={v => onChange('flatFee', v)}
          type="number"
        />
        <Field
          label="Flat Rate (km)"
          value={data.flatRateKm}
          onChange={v => onChange('flatRateKm', v)}
          type="number"
          hint="Flat fee applies up to this distance"
        />
        <Field
          label="Per km Rate ($)"
          value={data.perKmRate}
          onChange={v => onChange('perKmRate', v)}
          type="number"
          hint="Charged per km beyond threshold"
        />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 'any' : undefined}
        className="input text-sm"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

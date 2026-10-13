/**
 * @fileoverview Service Catalog page (UC01 – Web).
 * Role: All. Patients and guests can browse the laboratory service catalog.
 * UI follows the mockup: stats header, category filter chips, search, and service cards.
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchServiceCatalog } from '../api/catalogApi';
import ServiceCard from '../components/ServiceCard';

/**
 * ServiceCatalogPage – UC01 Web.
 *
 * @returns {JSX.Element}
 */
export default function ServiceCatalogPage() {
  const [packages, setPackages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchServiceCatalog({
        category: selectedCategory || undefined,
        search: search || undefined,
      });
      // Normalize casing from API (.NET default camelCase)
      setPackages(data.packages ?? data.Packages ?? []);
      setCategories(data.categories ?? data.Categories ?? []);
    } catch (err) {
      setError(err.message || 'Failed to load service catalog.');
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleBook = (pkg) => {
    // Placeholder – Book Appointment (UC21) will be implemented by another team member.
    // Keep this callback so there is no conflict.
    console.info('[UC01] Book requested for package:', pkg.id || pkg.Id, pkg.packageName || pkg.PackageName);
    alert(
      `Book appointment for: ${pkg.packageName || pkg.PackageName}\n` +
        `(Book Appointment feature will be integrated in UC21)`
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f0f9ff 0%, #f8fafc 40%, #fff 100%)',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Hero */}
      <header
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '48px 24px 32px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 36 }}>🩸</span>
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 800,
              color: '#1e3a8a',
              letterSpacing: '-0.02em',
            }}
          >
            Laboratory Services
          </h1>
        </div>
        <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 16 }}>
          Comprehensive blood testing services with high accuracy
        </p>

        {/* Stats bar */}
        <div
          style={{
            display: 'inline-flex',
            gap: 40,
            background: '#fff',
            borderRadius: 16,
            padding: '16px 36px',
            boxShadow: '0 4px 24px rgba(30, 58, 138, 0.08)',
          }}
        >
          {[
            { value: '99.9%', label: 'Accuracy' },
            { value: '2-4h', label: 'Turnaround' },
            { value: '24/7', label: 'Support' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Filters */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 24px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            style={chipStyle(!selectedCategory)}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={chipStyle(selectedCategory === cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8 }}>
          <input
            type="search"
            placeholder="Search packages..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              fontSize: 14,
              minWidth: 220,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 64px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
            Loading service catalog...
          </div>
        )}

        {error && !loading && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 12,
              padding: 20,
              color: '#b91c1c',
              textAlign: 'center',
            }}
          >
            {error}
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={loadCatalog}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #b91c1c',
                  background: '#fff',
                  color: '#b91c1c',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && packages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
            No matching service packages found.
          </div>
        )}

        {!loading && !error && packages.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 24,
            }}
          >
            {packages.map((pkg) => (
              <ServiceCard
                key={pkg.id || pkg.Id}
                package={{
                  id: pkg.id || pkg.Id,
                  packageCode: pkg.packageCode || pkg.PackageCode,
                  packageName: pkg.packageName || pkg.PackageName,
                  category: pkg.category || pkg.Category,
                  price: pkg.price ?? pkg.Price,
                  description: pkg.description || pkg.Description,
                  sampleTube: pkg.sampleTube || pkg.SampleTube,
                  sampleVolumeMl: pkg.sampleVolumeMl ?? pkg.SampleVolumeMl,
                }}
                onBook={handleBook}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Style helper for filter chips.
 * @param {boolean} active
 */
function chipStyle(active) {
  return {
    padding: '8px 16px',
    borderRadius: 20,
    border: active ? 'none' : '1px solid #e2e8f0',
    background: active ? '#2563eb' : '#fff',
    color: active ? '#fff' : '#475569',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  };
}
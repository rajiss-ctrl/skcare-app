// pages/AllProducts.tsx
import { useState, useMemo } from 'react';
import NavBar            from '../components/NavBar';
import ProductList       from '../components/landingpage/ProductList';
import { useProductContext } from '../context/ProductContext';
import useDebounce       from '../hooks/useDebounce';

// ─── Category list derived from products ─────────────────────────────────────
const ALL_LABEL = 'All';

// ─── Search icon ─────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg
    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ClearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
const AllProducts = () => {
  const { products, isLoading } = useProductContext();

  const [rawQuery,       setRawQuery]       = useState('');
  const [activeCategory, setActiveCategory] = useState(ALL_LABEL);

  // Debounce the search query — only filter 350 ms after the user stops typing
  const query = useDebounce(rawQuery.trim(), 350);

  // ── Derive category list from live product data ───────────────────────────
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if ((p as { category?: string }).category) {
        cats.add((p as { category?: string }).category!);
      }
    });
    return [ALL_LABEL, ...Array.from(cats).sort()];
  }, [products]);

  // ── Client-side filter ────────────────────────────────────────────────────
  // ProductList already handles rendering; we just pass filtered products.
  const filteredProducts = useMemo(() => {
    let result = products;

    // Category filter
    if (activeCategory !== ALL_LABEL) {
      result = result.filter(
        (p) => (p as { category?: string }).category === activeCategory
      );
    }

    // Search filter (name match, case-insensitive)
    if (query) {
      const lower = query.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(lower) ||
        (p as { description?: string }).description?.toLowerCase().includes(lower)
      );
    }

    return result;
  }, [products, activeCategory, query]);

  const resultCount = filteredProducts.length;
  const isFiltering = query !== '' || activeCategory !== ALL_LABEL;

  return (
    <div className="min-h-screen bg-[#FAFAFA] overflow-x-hidden">
      <NavBar />

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 py-8 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Shop All Products
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading
              ? 'Loading products…'
              : `${resultCount} product${resultCount !== 1 ? 's' : ''}${
                  isFiltering ? ' found' : ' available'
                }`}
          </p>
        </div>
      </div>

      {/* ── Search + filter bar ───────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row gap-3">

            {/* Search input */}
            <div className="relative flex-1">
              <SearchIcon />
              <input
                type="search"
                value={rawQuery}
                onChange={(e) => setRawQuery(e.target.value)}
                placeholder="Search products…"
                aria-label="Search products"
                className="w-full pl-10 pr-9 py-2.5 text-sm border border-gray-200
                           rounded-xl bg-gray-50 focus:bg-white focus:outline-none
                           focus:border-[#4F705B] focus:ring-1 focus:ring-[#4F705B]
                           placeholder:text-gray-400 transition"
              />
              {/* Clear button */}
              {rawQuery && (
                <button
                  onClick={() => setRawQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-gray-400 hover:text-gray-600 transition"
                >
                  <ClearIcon />
                </button>
              )}
            </div>

            {/* Category pills — horizontally scrollable on mobile */}
            {categories.length > 1 && (
              <div
                className="flex items-center gap-2 overflow-x-auto pb-0.5
                           scrollbar-none sm:flex-wrap"
                role="group"
                aria-label="Filter by category"
              >
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    aria-pressed={activeCategory === cat}
                    className={`flex-shrink-0 text-xs font-medium px-3.5 py-2
                                rounded-xl border transition-all whitespace-nowrap ${
                      activeCategory === cat
                        ? 'bg-[#4F705B] text-white border-[#4F705B] shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#4F705B] hover:text-[#4F705B]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active filter summary */}
          {isFiltering && !isLoading && (
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="text-xs text-gray-500">Filters:</span>

              {query && (
                <span className="inline-flex items-center gap-1 text-xs bg-[#f0f7f3]
                                 text-[#4F705B] border border-[#4F705B]/20
                                 px-2.5 py-1 rounded-full font-medium">
                  "{query}"
                  <button
                    onClick={() => setRawQuery('')}
                    aria-label="Remove search filter"
                    className="hover:text-[#3a5344] ml-0.5"
                  >
                    <ClearIcon />
                  </button>
                </span>
              )}

              {activeCategory !== ALL_LABEL && (
                <span className="inline-flex items-center gap-1 text-xs bg-[#f0f7f3]
                                 text-[#4F705B] border border-[#4F705B]/20
                                 px-2.5 py-1 rounded-full font-medium">
                  {activeCategory}
                  <button
                    onClick={() => setActiveCategory(ALL_LABEL)}
                    aria-label="Remove category filter"
                    className="hover:text-[#3a5344] ml-0.5"
                  >
                    <ClearIcon />
                  </button>
                </span>
              )}

              <button
                onClick={() => { setRawQuery(''); setActiveCategory(ALL_LABEL); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── No results ────────────────────────────────────────────────── */}
      {!isLoading && isFiltering && resultCount === 0 && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 py-20 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-lg font-semibold text-gray-700">No products found</h2>
          <p className="text-sm text-gray-400 mt-1">
            Try a different search term or remove a filter.
          </p>
          <button
            onClick={() => { setRawQuery(''); setActiveCategory(ALL_LABEL); }}
            className="mt-5 px-6 py-2.5 bg-[#4F705B] text-white text-sm
                       font-semibold rounded-xl hover:bg-[#3a5344] transition"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* ── Product list ──────────────────────────────────────────────── */}
      {(resultCount > 0 || isLoading) && (
        <div className="w-full overflow-x-hidden">
          <ProductList filteredProducts={isFiltering ? filteredProducts : undefined} />
        </div>
      )}
    </div>
  );
};

export default AllProducts;

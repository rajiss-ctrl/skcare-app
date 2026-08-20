// admin/components/Products.tsx
// Admin product list — view, toggle active/inactive, quick price edit.
// Staff and above can update. Only superadmin can deactivate (soft-delete).
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const API = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:5000';

interface Product {
  _id:        string;
  name:       string;
  description:string;
  price:      number;
  stock:      number;
  trackStock: boolean;
  category:   string;
  imageUrl:   string;
  isActive:   boolean;
  createdAt:  string;
}

const Products = () => {
  const { getToken, user } = useAuth();
  const isSuperadmin = user?.topRole === 'superadmin';

  const [products,  setProducts]  = useState<Product[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [page,      setPage]      = useState(1);
  const [hasMore,   setHasMore]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [editId,    setEditId]    = useState<string | null>(null);
  const [editField, setEditField] = useState<'price' | 'qty' | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQty,   setEditQty]   = useState('');
  const [saving,    setSaving]    = useState<string | null>(null);

  // Open inline editor for a specific field
  const startEdit = (product: Product, field: 'price' | 'qty') => {
    setEditId(product._id);
    setEditField(field);
    if (field === 'price') setEditPrice(String(product.price));
    if (field === 'qty')   setEditQty(String(product.stock));
  };

  const cancelEdit = () => { setEditId(null); setEditField(null); };

  const saveEdit = (product: Product) => {
    if (editField === 'price') {
      const val = parseFloat(editPrice);
      if (isNaN(val) || val < 0) return;
      updateProduct(product._id, { price: val });
    }
    if (editField === 'qty') {
      const val = parseInt(editQty, 10);
      if (isNaN(val) || val < 0) return;
      updateProduct(product._id, { stock: val });
    }
  };

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${getToken()}`,
  });

  const fetchProducts = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page:  String(p),
        limit: '20',
        ...(search ? { search } : {}),
      });
      // Admin needs to see inactive too — fetch without isActive filter
      const res  = await fetch(`${API}/api/products?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch products');
      if (p === 1) {
        setProducts(data.data ?? []);
      } else {
        setProducts((prev) => [...prev, ...(data.data ?? [])]);
      }
      setHasMore((data.pagination?.page ?? 1) < (data.pagination?.pages ?? 1));
      setPage(p);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchProducts(1); }, [fetchProducts]);

  const updateProduct = async (id: string, updates: Record<string, unknown>) => {
    setSaving(id);
    try {
      const res  = await fetch(`${API}/api/products/${id}`, {
        method:  'PUT',
        headers: authHeaders(),
        body:    JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setProducts((prev) => prev.map((p) => p._id === id ? { ...p, ...data.product } : p));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(null);
      setEditId(null);
    }
  };

  const handleDeactivate = (product: Product) => {
    if (!window.confirm(
      `${product.isActive ? 'Deactivate' : 'Reactivate'} "${product.name}"?`
    )) return;
    updateProduct(product._id, { isActive: !product.isActive });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">Products</h2>
          <p className="text-xs text-gray-400 mt-0.5">{products.length} loaded</p>
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 w-48
                       focus:outline-none focus:border-[#4F705B]"
          />
          <button onClick={() => fetchProducts(1)}
            className="text-xs px-3 py-2 bg-[#4F705B] text-white rounded-lg hover:bg-[#3a5344] transition">
            Search
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading && products.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#4F705B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No products found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50 transition">
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={product.imageUrl} alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate max-w-[160px]">
                            {product.name}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate max-w-[160px]">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Price — inline edit */}
                    <td className="px-4 py-3 text-right">
                      {editId === product._id && editField === 'price' ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(product); if (e.key === 'Escape') cancelEdit(); }}
                            className="w-24 text-xs border border-gray-300 rounded px-2 py-1
                                       focus:outline-none focus:border-[#4F705B] text-right"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEdit(product)}
                            disabled={saving === product._id}
                            className="text-[10px] bg-[#4F705B] text-white px-2 py-1 rounded disabled:opacity-50"
                          >
                            {saving === product._id ? '…' : '✓'}
                          </button>
                          <button onClick={cancelEdit}
                            className="text-[10px] text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(product, 'price')}
                          className="text-xs font-semibold text-gray-800 hover:text-[#4F705B] transition"
                          title="Click to edit price"
                        >
                          ₦{product.price.toLocaleString()}
                        </button>
                      )}
                    </td>

                    {/* Qty — always shown, inline editable */}
                    <td className="px-4 py-3 text-center">
                      {editId === product._id && editField === 'qty' ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={editQty}
                            min="0"
                            onChange={(e) => setEditQty(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(product); if (e.key === 'Escape') cancelEdit(); }}
                            className="w-16 text-xs border border-gray-300 rounded px-2 py-1
                                       focus:outline-none focus:border-[#4F705B] text-center"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEdit(product)}
                            disabled={saving === product._id}
                            className="text-[10px] bg-[#4F705B] text-white px-2 py-1 rounded disabled:opacity-50"
                          >
                            {saving === product._id ? '…' : '✓'}
                          </button>
                          <button onClick={cancelEdit}
                            className="text-[10px] text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(product, 'qty')}
                          title="Click to edit quantity"
                          className={`text-xs font-semibold transition hover:text-[#4F705B] ${
                            product.trackStock && product.stock === 0
                              ? 'text-red-500'
                              : 'text-gray-700'
                          }`}
                        >
                          {product.stock}
                          {product.trackStock && (
                            <span className="ml-1 text-[9px] text-gray-400 font-normal">tracked</span>
                          )}
                        </button>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">
                      {product.category || '—'}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        product.isActive
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isSuperadmin && (
                          <button
                            onClick={() => handleDeactivate(product)}
                            disabled={saving === product._id}
                            className={`text-xs font-medium disabled:opacity-40 transition ${
                              product.isActive
                                ? 'text-red-400 hover:text-red-600'
                                : 'text-[#4F705B] hover:text-[#3a5344]'
                            }`}
                          >
                            {saving === product._id ? '…' : product.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button onClick={() => fetchProducts(page + 1)} disabled={loading}
            className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium
                       text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition">
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Products;

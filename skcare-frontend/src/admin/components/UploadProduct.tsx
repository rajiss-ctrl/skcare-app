// admin/components/UploadProduct.tsx
import { useState, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';

const API = `${import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:5000'}/api/products`;

const ProductUploadForm = () => {
  const { getToken } = useAuth();

  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [price,       setPrice]       = useState('');
  const [stock,       setStock]       = useState('');
  const [trackStock,  setTrackStock]  = useState(false);
  const [category,    setCategory]    = useState('');
  const [imageFile,   setImageFile]   = useState<File | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState('');
  const [error,       setError]       = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const token = getToken();
    if (!token) { setError('You must be signed in as an admin to upload products.'); return; }
    if (!imageFile) { setError('Please select an image file.'); return; }

    const formData = new FormData();
    formData.append('name',        name);
    formData.append('description', description);
    formData.append('price',       price);
    formData.append('stock',       stock || '0');
    formData.append('trackStock',  String(trackStock));
    if (category) formData.append('category', category);
    formData.append('image',       imageFile);

    setLoading(true);
    try {
      const response = await fetch(API, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        // Do NOT set Content-Type — let the browser set multipart/form-data with boundary
        body:    formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Upload failed');

      setSuccess(`"${data.product.name}" uploaded successfully!`);
      setName(''); setDescription(''); setPrice('');
      setStock(''); setCategory(''); setImageFile(null); setTrackStock(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setImageFile(e.target.files?.[0] || null);
  };

  const inputClass =
    'mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 text-sm focus:outline-none focus:border-[#4F705B]';

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto p-6 bg-white shadow rounded-lg space-y-4 my-24"
    >
      <h2 className="text-lg font-semibold text-gray-800">Upload New Product</h2>

      {success && (
        <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{success}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Name *</label>
        <input
          type="text" value={name} required
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description *</label>
        <textarea
          value={description} required rows={3}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Price (₦) *</label>
          <input
            type="number" min="0" step="0.01" value={price} required
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
          <input
            type="number" min="0" value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </div>
      </div>

      {/* Track stock toggle */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <input
          type="checkbox"
          id="trackStock"
          checked={trackStock}
          onChange={(e) => setTrackStock(e.target.checked)}
          className="w-4 h-4 accent-[#4F705B]"
        />
        <label htmlFor="trackStock" className="text-sm text-gray-700 cursor-pointer">
          <span className="font-medium">Enable stock tracking</span>
          <span className="text-gray-400 ml-1">
            — prevent purchases when stock reaches 0
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <input
          type="text" value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. skincare, haircare"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Product Image *</label>
        <input
          type="file" accept="image/*" required
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-gray-600"
        />
        {imageFile && (
          <p className="text-xs text-gray-400 mt-1">Selected: {imageFile.name}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#4F705B] text-white py-3 px-4 rounded-md hover:bg-[#3a5344] transition disabled:opacity-50 font-semibold"
      >
        {loading ? 'Uploading…' : 'Upload Product'}
      </button>
    </form>
  );
};

export default ProductUploadForm;

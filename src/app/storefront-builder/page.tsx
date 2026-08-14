'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Globe, 
  LayoutDashboard, 
  Zap, 
  Package, 
  BarChart2, 
  Save,
  MonitorSmartphone,
  Palette,
  Image as ImageIcon
} from 'lucide-react';
import Logo from '@/components/Logo';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

export default function StorefrontBuilder() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeId, setStoreId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    storefrontEnabled: false,
    themeColor: '#059669',
    logoUrl: '',
    bannerUrl: '',
    tagline: '',
    description: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data?.data) {
        const data = res.data.data;
        setStoreId(data.id);
        setFormData({
          name: data.name || '',
          storefrontEnabled: data.storefrontEnabled || false,
          themeColor: data.themeColor || '#059669',
          logoUrl: data.logoUrl || '',
          bannerUrl: data.bannerUrl || '',
          tagline: data.tagline || '',
          description: data.description || ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings', formData);
      
      // Update local storage so other parts of the app (like POS) get the new store name
      if (res.data?.data) {
        const currentStore = JSON.parse(localStorage.getItem('kos_store') || '{}');
        const updatedStore = { ...currentStore, ...res.data.data };
        localStorage.setItem('kos_store', JSON.stringify(updatedStore));
      }

      alert('Storefront settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 p-4 md:p-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Storefront Builder</h1>
            <p className="text-sm text-gray-500 mt-1">Customize your online shop and launch your e-commerce store</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href={`/store/${storeId}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              <MonitorSmartphone className="w-4 h-4" /> Preview Store
            </a>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-[#059669] text-white rounded-lg text-sm font-medium hover:bg-[#047857] disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </header>

        {/* Builder Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Enable Storefront Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Enable Online Storefront</h3>
                <p className="text-sm text-gray-500 mt-1">Allow customers to visit your link and place orders online</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={formData.storefrontEnabled}
                  onChange={(e) => setFormData({...formData, storefrontEnabled: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#059669]"></div>
              </label>
            </div>

            {/* Customization Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-gray-900">Brand Identity</h3>
              </div>
              <div className="p-4 md:p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Theme Color (Hex)</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={formData.themeColor}
                        onChange={(e) => setFormData({...formData, themeColor: e.target.value})}
                        className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                      />
                      <input 
                        type="text" 
                        value={formData.themeColor}
                        onChange={(e) => setFormData({...formData, themeColor: e.target.value})}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#059669]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Store Tagline</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Fresh groceries delivered fast"
                      value={formData.tagline}
                      onChange={(e) => setFormData({...formData, tagline: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#059669]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">About Store / Description</label>
                  <textarea 
                    rows={3}
                    placeholder="Tell your customers about your store..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#059669] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Media Assets */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-gray-900">Media & Images</h3>
              </div>
              <div className="p-4 md:p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Store Logo URL</label>
                  <input 
                    type="url" 
                    placeholder="https://example.com/logo.png"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#059669]"
                  />
                  {formData.logoUrl && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-100 inline-block">
                      <img src={formData.logoUrl} alt="Logo Preview" className="h-12 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hero Banner URL</label>
                  <input 
                    type="url" 
                    placeholder="https://example.com/banner.jpg"
                    value={formData.bannerUrl}
                    onChange={(e) => setFormData({...formData, bannerUrl: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#059669]"
                  />
                  {formData.bannerUrl && (
                    <div className="mt-3 rounded-lg border border-gray-100 overflow-hidden h-32 relative">
                      <img src={formData.bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

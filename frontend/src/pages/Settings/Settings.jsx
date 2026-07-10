import React, { useState, useEffect } from 'react';
import {
  Building2, Settings as SettingsIcon, Printer, Package, User,
  Database, Save, Loader2, Upload, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import useAuthStore from '@/store/authStore';

const TABS = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'pos', label: 'POS', icon: Printer },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'preferences', label: 'Preferences', icon: User },
  { id: 'maintenance', label: 'Maintenance', icon: Database },
];

const Settings = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Company settings
  const [company, setCompany] = useState({
    company_name: 'PGPOS Store',
    company_address: '',
    company_contact: '',
    company_email: '',
    tax_id: '',
    logo_url: '',
  });

  // POS settings
  const [pos, setPos] = useState({
    receipt_header: '',
    receipt_footer: 'Thank you for your purchase!',
    vat_rate: '12',
    currency: 'PHP',
    decimal_places: '2',
  });

  // Inventory settings
  const [inventory, setInventory] = useState({
    barcode_format: 'CODE128',
    low_stock_threshold: '10',
    default_unit: 'piece',
  });

  // Preferences
  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'en',
    timezone: 'Asia/Manila',
    items_per_page: '20',
  });

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const res = await settingsAPI.getAll();
        const settings = res.data || [];
        const map = {};
        settings.forEach(s => { map[s.key] = s.value; });

        if (map.company_name) setCompany(prev => ({ ...prev, ...map }));
        if (map.receipt_header) setPos(prev => ({ ...prev, ...map }));
        if (map.barcode_format) setInventory(prev => ({ ...prev, ...map }));
        if (map.theme) setPreferences(prev => ({ ...prev, ...map }));
      } catch (err) {
        // Use defaults
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async (key, value) => {
    setSaving(true);
    try {
      await settingsAPI.update(key, { key, value });
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async (section, data) => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(data)) {
        await settingsAPI.update(key, { key, value });
      }
      toast.success(`${section} settings saved`);
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Configure your system</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Company Settings */}
      {activeTab === 'company' && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Company Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Company Logo</label>
                <div className="flex items-center gap-4">
                  {company.logo_url ? (
                    <div className="relative">
                      <img src={company.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-lg border" />
                      <button className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-1" /> Upload Logo
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <Input value={company.company_name} onChange={(e) => setCompany({ ...company, company_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tax ID</label>
                <Input value={company.tax_id} onChange={(e) => setCompany({ ...company, tax_id: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea
                  value={company.company_address}
                  onChange={(e) => setCompany({ ...company, company_address: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Number</label>
                <Input value={company.company_contact} onChange={(e) => setCompany({ ...company, company_contact: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input type="email" value={company.company_email} onChange={(e) => setCompany({ ...company, company_email: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveAll('Company', company)} isLoading={saving}>
                <Save className="h-4 w-4 mr-1" /> Save Company Info
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* POS Settings */}
      {activeTab === 'pos' && (
        <Card>
          <CardHeader><CardTitle className="text-lg">POS Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Receipt Header</label>
              <textarea
                value={pos.receipt_header}
                onChange={(e) => setPos({ ...pos, receipt_header: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
                rows={2}
                placeholder="Text to appear at top of receipt"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Receipt Footer</label>
              <textarea
                value={pos.receipt_footer}
                onChange={(e) => setPos({ ...pos, receipt_footer: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
                rows={2}
                placeholder="Text to appear at bottom of receipt"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">VAT Rate (%)</label>
                <Input type="number" value={pos.vat_rate} onChange={(e) => setPos({ ...pos, vat_rate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <Select value={pos.currency} onChange={(e) => setPos({ ...pos, currency: e.target.value })}>
                  <option value="PHP">PHP (₱)</option>
                  <option value="USD">USD ($)</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Decimal Places</label>
                <Select value={pos.decimal_places} onChange={(e) => setPos({ ...pos, decimal_places: e.target.value })}>
                  <option value="0">0</option>
                  <option value="2">2</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveAll('POS', pos)} isLoading={saving}>
                <Save className="h-4 w-4 mr-1" /> Save POS Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Settings */}
      {activeTab === 'inventory' && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Inventory Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Barcode Format</label>
                <Select value={inventory.barcode_format} onChange={(e) => setInventory({ ...inventory, barcode_format: e.target.value })}>
                  <option value="CODE128">CODE128</option>
                  <option value="EAN13">EAN-13</option>
                  <option value="UPC">UPC</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Low Stock Threshold</label>
                <Input type="number" value={inventory.low_stock_threshold} onChange={(e) => setInventory({ ...inventory, low_stock_threshold: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Default Unit</label>
                <Select value={inventory.default_unit} onChange={(e) => setInventory({ ...inventory, default_unit: e.target.value })}>
                  <option value="piece">Piece</option>
                  <option value="box">Box</option>
                  <option value="bottle">Bottle</option>
                  <option value="pack">Pack</option>
                  <option value="kg">Kilogram</option>
                  <option value="g">Gram</option>
                  <option value="l">Liter</option>
                  <option value="ml">Milliliter</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveAll('Inventory', inventory)} isLoading={saving}>
                <Save className="h-4 w-4 mr-1" /> Save Inventory Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preferences */}
      {activeTab === 'preferences' && (
        <Card>
          <CardHeader><CardTitle className="text-lg">User Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Theme</label>
                <Select value={preferences.theme} onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Language</label>
                <Select value={preferences.language} onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}>
                  <option value="en">English</option>
                  <option value="fil">Filipino</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Timezone</label>
                <Select value={preferences.timezone} onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}>
                  <option value="Asia/Manila">Asia/Manila (UTC+8)</option>
                  <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Items Per Page</label>
                <Select value={preferences.items_per_page} onChange={(e) => setPreferences({ ...preferences, items_per_page: e.target.value })}>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveAll('Preferences', preferences)} isLoading={saving}>
                <Save className="h-4 w-4 mr-1" /> Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Maintenance */}
      {activeTab === 'maintenance' && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Database Maintenance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-sm mb-2">Backup Database</h3>
                <p className="text-xs text-gray-500 mb-3">Create a backup of your database</p>
                <Button variant="outline" size="sm">
                  <Database className="h-4 w-4 mr-1" /> Create Backup
                </Button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-sm mb-2">Restore Database</h3>
                <p className="text-xs text-gray-500 mb-3">Restore from a previous backup</p>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-1" /> Restore
                </Button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-sm mb-2">Clear Cache</h3>
                <p className="text-xs text-gray-500 mb-3">Clear system cache and temporary data</p>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" /> Clear Cache
                </Button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-sm mb-2">System Logs</h3>
                <p className="text-xs text-gray-500 mb-3">View and export system logs</p>
                <Button variant="outline" size="sm">
                  <SettingsIcon className="h-4 w-4 mr-1" /> View Logs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Settings;
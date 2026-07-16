import React, { useState, useEffect } from 'react';
import './index.css';
import './container.css';
import './responsive.css';
import * as Icons from './Icons';
import PhoneInput, { isValidPhone } from './PhoneInput';
import PriceInput from './PriceInput';

// API Client Helper
const API_URL = 'https://kitchencrm-production.up.railway.app/api';

const getSecureUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('blob:')) return url;
  return url.replace(/^http:\/\//i, 'https://');
};

// Formatting helpers
const formatPrice = (val) => {
  if (val === undefined || val === null || val === '') return '';
  const clean = val.toString().replace(/\D/g, '');
  if (!clean) return '';
  return new Intl.NumberFormat('ru-RU').format(parseInt(clean)).replace(/,/g, ' ');
};

const parsePrice = (val) => {
  if (!val) return '';
  return val.toString().replace(/\s/g, '');
};

const formatPhoneNumber = (val) => {
  if (!val) return '+998';
  let clean = val.replace(/[^\d+]/g, '');
  if (!clean.startsWith('+')) {
    clean = '+' + clean;
  }
  if (clean.length < 4) {
    return '+998';
  }
  const digits = clean.slice(4).replace(/\D/g, '');
  let formatted = '+998';
  if (digits.length > 0) {
    formatted += ' (' + digits.slice(0, 2);
  }
  if (digits.length > 2) {
    formatted += ') ' + digits.slice(2, 5);
  }
  if (digits.length > 5) {
    formatted += ' ' + digits.slice(5, 7);
  }
  if (digits.length > 7) {
    formatted += ' ' + digits.slice(7, 9);
  }
  return formatted;
};

const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers
    });
    
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });
          const refreshData = await refreshRes.json();
          if (refreshData.success) {
            localStorage.setItem('accessToken', refreshData.data.accessToken);
            headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
            const retryRes = await fetch(`${API_URL}${url}`, {
              ...options,
              headers
            });
            return await retryRes.json();
          }
        } catch (err) {
          console.error("Token refresh failed", err);
        }
      }
      localStorage.clear();
      window.location.hash = '#/login';
      return { success: false, error: 'Seans muddati tugadi. Qayta kiring.' };
    }
    
    return await response.json();
  } catch (error) {
    console.error("API call error:", error);
    return { success: false, error: 'Server bilan aloqa uzildi.' };
  }
};

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.hash || '#/login');
  const [user, setUser] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [modal, setModal] = useState(null); // { type, title, body, onConfirm, confirmText, cancelText }

  // Notification / Toast helper
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      const hash = window.location.hash || '';
      if (hash === '#/login' || hash === '' || hash === '#') {
        const parsed = JSON.parse(savedUser);
        if (parsed.role === 'SUPER_ADMIN') {
          window.location.hash = '#/superadmin/dashboard';
        } else if (parsed.role === 'MANAGER') {
          window.location.hash = '#/manager/dashboard';
        }
      }
    } else {
      window.location.hash = '#/login';
    }

    const handleHashChange = () => {
      const hash = window.location.hash || '#/login';
      setCurrentPath(hash);
      
      const currentToken = localStorage.getItem('accessToken');
      if (!currentToken && hash !== '#/login') {
        window.location.hash = '#/login';
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Handle Log Out
  const handleLogout = async () => {
    setModal({
      type: 'logout',
      title: 'Tizimdan chiqish',
      body: 'Haqiqatan ham tizimdan chiqmoqchimisiz?',
      confirmText: 'Chiqish',
      cancelText: 'Bekor qilish',
      onConfirm: async () => {
        setLoading(true);
        await apiCall('/auth/logout', { method: 'POST' });
        localStorage.clear();
        setUser(null);
        setModal(null);
        setLoading(false);
        addToast('Tizimdan muvaffaqiyatli chiqildi.', 'success');
        window.location.hash = '#/login';
      }
    });
  };

  return (
    <div className="app-layout">
      {/* Toast Manager */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' && <Icons.Check size={20} />}
            {t.type === 'error' && <Icons.AlertTriangle size={20} />}
            {t.type === 'warning' && <Icons.AlertTriangle size={20} />}
            {t.type === 'info' && <Icons.Info size={20} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Modal Manager */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="card-title" style={{ margin: 0 }}>{modal.title}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setModal(null)}>
                <Icons.X size={16} />
              </button>
            </div>
            <div>{modal.body}</div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>
                {modal.cancelText || 'Yopish'}
              </button>
              {modal.onConfirm && (
                <button 
                  className={`btn ${modal.type === 'delete' ? 'btn-danger' : 'btn-primary'}`} 
                  onClick={modal.onConfirm}
                  disabled={loading}
                >
                  {loading ? <div className="spinner"></div> : modal.confirmText || 'Tasdiqlash'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page Routing */}
      {currentPath.includes('#/login') ? (
        <LoginPage setUser={setUser} addToast={addToast} />
      ) : user ? (
        <div className="admin-layout">
          {/* Sidebar */}
          <div className="sidebar">
            <div className="sidebar-brand">
              <Icons.Shield size={24} className="stat-icon-info" />
              <span>KITCHEN<span>ERP</span></span>
            </div>
            
            <div className="sidebar-menu">
              {user.role === 'SUPER_ADMIN' ? (
                <>
                  <a href="#/superadmin/dashboard" className={`sidebar-link ${currentPath === '#/superadmin/dashboard' ? 'active' : ''}`}>
                    <Icons.LayoutDashboard size={20} />
                    <span>Dashboard</span>
                  </a>
                  <a href="#/superadmin/branches" className={`sidebar-link ${currentPath === '#/superadmin/branches' ? 'active' : ''}`}>
                    <Icons.Layers size={20} />
                    <span>Filiallar</span>
                  </a>
                  <a href="#/superadmin/managers" className={`sidebar-link ${currentPath === '#/superadmin/managers' ? 'active' : ''}`}>
                    <Icons.Users size={20} />
                    <span>Menejerlar</span>
                  </a>
                  <a href="#/superadmin/logs" className={`sidebar-link ${currentPath === '#/superadmin/logs' ? 'active' : ''}`}>
                    <Icons.Clipboard size={20} />
                    <span>Audit Loglari</span>
                  </a>
                </>
              ) : (
                <>
                  <a href="#/manager/dashboard" className={`sidebar-link ${currentPath === '#/manager/dashboard' ? 'active' : ''}`}>
                    <Icons.LayoutDashboard size={20} />
                    <span>Dashboard</span>
                  </a>
                  <a href="#/manager/employees" className={`sidebar-link ${currentPath === '#/manager/employees' ? 'active' : ''}`}>
                    <Icons.Users size={20} />
                    <span>Xodimlar</span>
                  </a>
                  <a href="#/manager/menu" className={`sidebar-link ${currentPath === '#/manager/menu' ? 'active' : ''}`}>
                    <Icons.Coffee size={20} />
                    <span>Menu & Kategoriya</span>
                  </a>
                  <a href="#/manager/tables" className={`sidebar-link ${currentPath === '#/manager/tables' ? 'active' : ''}`}>
                    <Icons.Layers size={20} />
                    <span>Stollar & VIP</span>
                  </a>
                  <a href="#/manager/inventory" className={`sidebar-link ${currentPath === '#/manager/inventory' ? 'active' : ''}`}>
                    <Icons.ShoppingBag size={20} />
                    <span>Omborxona</span>
                  </a>
                  <a href="#/manager/discounts" className={`sidebar-link ${currentPath === '#/manager/discounts' ? 'active' : ''}`}>
                    <Icons.CreditCard size={20} />
                    <span>Chegirmalar</span>
                  </a>
                  <a href="#/manager/expenses" className={`sidebar-link ${currentPath === '#/manager/expenses' ? 'active' : ''}`}>
                    <Icons.DollarSign size={20} />
                    <span>Xarajatlar</span>
                  </a>
                  <a href="#/manager/notifications" className={`sidebar-link ${currentPath === '#/manager/notifications' ? 'active' : ''}`}>
                    <Icons.Bell size={20} />
                    <span>Bildirishnomalar</span>
                  </a>
                  <a href="#/manager/settings" className={`sidebar-link ${currentPath === '#/manager/settings' ? 'active' : ''}`}>
                    <Icons.Settings size={20} />
                    <span>Printer & KDS</span>
                  </a>
                </>
              )}
            </div>
            
            <div className="sidebar-footer">
              <div className="flex-row gap-2 align-center justify-between">
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.fullName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.role}</div>
                </div>
                <button className="btn btn-secondary btn-icon" onClick={handleLogout} title="Chiqish">
                  <Icons.LogOut size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Main Panel Content */}
          <div className="main-content">
            <div className="navbar">
              <div className="flex-row gap-2 align-center">
                <h2 style={{ fontSize: '1.25rem' }}>
                  {user.role === 'SUPER_ADMIN' ? 'Super Admin Boshqaruvi' : `Menejer Boshqaruvi (${user.branchName})`}
                </h2>
              </div>
              <div className="flex-row gap-4 align-center">
                <div className="badge badge-info">{user.role}</div>
                <button className="btn btn-secondary btn-icon" onClick={handleLogout}>
                  <Icons.LogOut size={18} />
                  <span>Chiqish</span>
                </button>
              </div>
            </div>
            
            <div className="app-container">
              {currentPath === '#/superadmin/dashboard' && <SuperAdminDashboard addToast={addToast} setModal={setModal} />}
              {currentPath === '#/superadmin/branches' && <SuperAdminBranches addToast={addToast} setModal={setModal} />}
              {currentPath === '#/superadmin/managers' && <SuperAdminManagers addToast={addToast} setModal={setModal} />}
              {currentPath === '#/superadmin/logs' && <SuperAdminLogs addToast={addToast} />}
              
              {currentPath === '#/manager/dashboard' && <ManagerDashboard user={user} addToast={addToast} />}
              {currentPath === '#/manager/employees' && <ManagerEmployees user={user} addToast={addToast} setModal={setModal} />}
              {currentPath === '#/manager/menu' && <ManagerMenu user={user} addToast={addToast} setModal={setModal} />}
              {currentPath === '#/manager/tables' && <ManagerTables user={user} addToast={addToast} setModal={setModal} />}
              {currentPath === '#/manager/inventory' && <ManagerInventory user={user} addToast={addToast} setModal={setModal} />}
              {currentPath === '#/manager/discounts' && <ManagerDiscounts user={user} addToast={addToast} setModal={setModal} />}
              {currentPath === '#/manager/expenses' && <ManagerExpenses user={user} addToast={addToast} setModal={setModal} />}
              {currentPath === '#/manager/notifications' && <ManagerNotifications user={user} addToast={addToast} />}
              {currentPath === '#/manager/settings' && <ManagerSettings user={user} addToast={addToast} setModal={setModal} />}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', placeContent: 'center', height: '100vh' }}>
          <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
        </div>
      )}
    </div>
  );
}

// ---------------- LOGIN PAGE ----------------
function LoginPage({ setUser, addToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      addToast('Barcha maydonlarni to\'ldiring', 'warning');
      return;
    }
    setLoading(true);
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setLoading(false);
    
    if (data.success) {
      addToast('Muvaffaqiyatli kirildi.', 'success');
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      setUser(data.data.user);
      
      // Redirect
      if (data.data.user.role === 'SUPER_ADMIN') {
        window.location.hash = '#/superadmin/dashboard';
      } else if (data.data.user.role === 'MANAGER') {
        window.location.hash = '#/manager/dashboard';
      } else {
        addToast('Ushbu panel faqat Super Admin va Menejerlar uchun!', 'error');
        localStorage.clear();
      }
    } else {
      addToast(data.error || 'Kirishda xatolik yuz berdi.', 'error');
    }
  };

  return (
    <div style={{ display: 'grid', placeContent: 'center', minHeight: '100vh', background: 'radial-gradient(circle at center, #111827 0%, #080c14 100%)' }}>
      <div className="card" style={{ width: '400px', padding: '2.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '1rem', backgroundColor: 'var(--border-color)', marginBottom: '1rem', color: 'var(--primary-color)' }}>
            <Icons.Shield size={32} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Kitchen ERP</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Boshqaruv va Ma'muriyat tizimi</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Foydalanuvchi nomi</label>
            <div className="search-container">
              <span className="search-icon" style={{ left: '0.8rem' }}><Icons.Users size={18} /></span>
              <input 
                type="text" 
                className="form-input search-input" 
                placeholder="Username" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Parol</label>
            <div className="search-container">
              <span className="search-icon" style={{ left: '0.8rem' }}><Icons.Settings size={18} /></span>
              <input 
                type="password" 
                className="form-input search-input" 
                placeholder="••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group flex-row justify-between" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                className="checkbox-input"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Meni eslab qol</span>
            </label>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', cursor: 'pointer' }} onClick={() => addToast('Parolni tiklash uchun Super Administratorga murojaat qiling.', 'info')}>Parolni unutdingizmi?</span>
          </div>

          <button type="submit" className="btn btn-primary w-full gap-2" style={{ padding: '0.75rem' }} disabled={loading}>
            {loading ? <div className="spinner"></div> : (
              <>
                <span>Tizimga kirish</span>
                <Icons.Check size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------- SUPER ADMIN DASHBOARD ----------------
function SuperAdminDashboard({ addToast, setModal }) {
  const [stats, setStats] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    const query = selectedBranchId ? `?branchId=${selectedBranchId}` : '';
    const data = await apiCall(`/dashboard${query}`);
    if (data.success) {
      setStats(data.data);
    } else {
      addToast(data.error || 'Statistikalarni yuklashda xatolik.', 'error');
    }
    
    // Also fetch branches list
    const branchRes = await apiCall('/branches?limit=100');
    if (branchRes.success) {
      setBranches(branchRes.data.rows);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, [selectedBranchId]);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeContent: 'center', height: '300px' }}>
        <div className="spinner" style={{ width: '2.5rem', height: '2.5rem' }}></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-row justify-between align-center mb-4">
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Statistika & Tahlillar</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Butun tarmoq bo'yicha real-vaqtdagi ma'lumotlar</p>
        </div>
        
        <div className="flex-row gap-2">
          <label className="form-label" style={{ margin: 0 }}>Filialni tanlang:</label>
          <select 
            className="form-select" 
            style={{ width: '220px' }}
            value={selectedBranchId}
            onChange={e => setSelectedBranchId(e.target.value)}
          >
            <option value="">Barcha filiallar</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {stats && (
        <>
          {/* Stats Cards */}
          <div className="stats-grid grid-4">
            <div className="card stat-card">
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Bugungi daromad</div>
                <div className="stat-val">{stats.revenue?.daily?.toLocaleString()} UZS</div>
              </div>
              <div className="stat-icon stat-icon-success"><Icons.DollarSign size={24} /></div>
            </div>
            
            <div className="card stat-card">
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Oylik daromad</div>
                <div className="stat-val">{stats.revenue?.monthly?.toLocaleString()} UZS</div>
              </div>
              <div className="stat-icon stat-icon-info"><Icons.CreditCard size={24} /></div>
            </div>

            <div className="card stat-card">
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Jami xarajatlar</div>
                <div className="stat-val">{stats.expenses?.toLocaleString()} UZS</div>
              </div>
              <div className="stat-icon stat-icon-danger"><Icons.Trash size={24} /></div>
            </div>

            <div className="card stat-card">
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sof foyda (Yillik)</div>
                <div className="stat-val" style={{ color: stats.profit >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                  {stats.profit?.toLocaleString()} UZS
                </div>
              </div>
              <div className="stat-icon stat-icon-warning"><Icons.LayoutDashboard size={24} /></div>
            </div>
          </div>

          <div className="grid-2 mt-4" style={{ marginBottom: '2rem' }}>
            {/* Orders Statistics */}
            <div className="card">
              <h4 className="card-title">Buyurtmalar holati</h4>
              <div className="flex-column gap-3" style={{ marginTop: '1rem' }}>
                <div className="flex-row justify-between align-center">
                  <span>Jami buyurtmalar</span>
                  <span className="badge badge-info">{stats.orders?.total}</span>
                </div>
                <div className="flex-row justify-between align-center">
                  <span>Tugallangan buyurtmalar</span>
                  <span className="badge badge-success">{stats.orders?.completed}</span>
                </div>
                <div className="flex-row justify-between align-center">
                  <span>Tayyorlanayotganlar</span>
                  <span className="badge badge-warning">{stats.orders?.preparing}</span>
                </div>
                <div className="flex-row justify-between align-center">
                  <span>Bekor qilinganlar</span>
                  <span className="badge badge-danger">{stats.orders?.cancelled}</span>
                </div>
              </div>
            </div>

            {/* Top Products */}
            <div className="card">
              <h4 className="card-title">Top 5 Mahsulotlar (Sotuv soni bo'yicha)</h4>
              <div className="flex-column gap-2" style={{ marginTop: '1rem' }}>
                {stats.topProducts?.length > 0 ? stats.topProducts.map((p, idx) => (
                  <div key={p.productId || idx} className="flex-row justify-between align-center" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span>{idx + 1}. {p.name}</span>
                    <span style={{ fontWeight: 600 }}>{p.totalSoldQuantity} ta ({p.totalRevenue?.toLocaleString()} UZS)</span>
                  </div>
                )) : <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>Sotuvlar mavjud emas</div>}
              </div>
            </div>
          </div>

          {/* Branch Breakdown Table */}
          <div className="card mt-4">
            <h4 className="card-title">Filiallar bo'yicha batafsil daromad</h4>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Filial nomi</th>
                    <th>Jami buyurtmalar soni</th>
                    <th>Jami daromad (UZS)</th>
                    <th>Sof ulush (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topBranches?.length > 0 ? stats.topBranches.map((tb, idx) => (
                    <tr key={tb.branchId || idx}>
                      <td style={{ fontWeight: 600 }}>{tb.branchName}</td>
                      <td>{tb.orderCount}</td>
                      <td style={{ color: 'var(--success-color)', fontWeight: 600 }}>{tb.totalRevenue?.toLocaleString()} UZS</td>
                      <td>
                        <div className="flex-row align-center gap-2">
                          <div className="progress-bar-container" style={{ width: '80px' }}>
                            <div className="progress-bar-fill" style={{ width: `${Math.min(100, (tb.totalRevenue / (stats.revenue?.yearly || 1)) * 100)}%` }}></div>
                          </div>
                          <span style={{ fontSize: '0.8rem' }}>
                            {((tb.totalRevenue / (stats.revenue?.yearly || 1)) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Filial ma'lumotlari yuklanmadi.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------- SUPER ADMIN BRANCHES CRUD ----------------
function SuperAdminBranches({ addToast, setModal }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logo, setLogo] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchBranches = async () => {
    setLoading(true);
    const data = await apiCall('/branches?limit=100');
    if (data.success) {
      setBranches(data.data.rows);
    } else {
      addToast(data.error || 'Filiallarni yuklashda xatolik.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setName('');
    setAddress('');
    setPhone('');
    setEmail('');
    setLogo('');
    setIsActive(true);
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name) {
      addToast('Filial nomi kiritilishi shart', 'warning');
      return;
    }
    let finalPhone = phone;
    if (finalPhone === '+998') finalPhone = '';

    if (finalPhone && !isValidPhone(finalPhone)) {
      addToast("Telefon raqami noto'g'ri formatda. Format: +998 (90) 123 45 67", 'warning');
      return;
    }
    
    const payload = {
      name,
      address,
      phone: finalPhone,
      email,
      logo,
      isActive
    };

    let res;
    if (editId) {
      res = await apiCall(`/branches/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiCall('/branches', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (res.success) {
      addToast(editId ? 'Filial yangilandi.' : 'Filial yaratildi.', 'success');
      resetForm();
      fetchBranches();
    } else {
      addToast(res.error || 'Saqlashda xatolik yuz berdi.', 'error');
    }
  };

  const handleEdit = (b) => {
    setEditId(b.id);
    setName(b.name || '');
    setAddress(b.address || '');
    setPhone(b.phone || '');
    setEmail(b.email || '');
    setLogo(b.logo || '');
    setIsActive(b.isActive !== false);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setModal({
      type: 'delete',
      title: 'Filialni o\'chirish',
      body: 'Haqiqatan ham ushbu filialni o\'chirib tashlamoqchimisiz? Ushbu amal ortga qaytmaydi.',
      confirmText: 'O\'chirish',
      onConfirm: async () => {
        const res = await apiCall(`/branches/${id}`, { method: 'DELETE' });
        setModal(null);
        if (res.success) {
          addToast('Filial o\'chirildi.', 'success');
          fetchBranches();
        } else {
          addToast(res.error || 'Filialni o\'chirishda xatolik.', 'error');
        }
      }
    });
  };

  const toggleBranchStatus = async (b) => {
    const nextStatus = !b.isActive;
    const res = await apiCall(`/branches/${b.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: nextStatus })
    });
    if (res.success) {
      addToast(nextStatus ? 'Filial faollashtirildi.' : 'Filial faolsizlantirildi.', 'success');
      fetchBranches();
    } else {
      addToast(res.error || 'Holatni o\'zgartirishda xatolik.', 'error');
    }
  };

  return (
    <div>
      <div className="flex-row justify-between align-center mb-4">
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Filiallar boshqaruvi</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tarmoqdagi restoran filiallarini boshqarish</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary gap-2" onClick={() => setShowForm(true)}>
            <Icons.Plus size={18} />
            <span>Yangi filial qo'shish</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-4" style={{ animation: 'scaleIn 0.2s ease' }}>
          <h4 className="card-title">{editId ? 'Filialni tahrirlash' : 'Yangi filial qo\'shish'}</h4>
          <form onSubmit={handleSave}>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Filial nomi *</label>
                <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Telefon raqami</label>
                <PhoneInput value={phone} onChange={setPhone} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" placeholder="email@branch.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Manzil (Address)</label>
                <input type="text" className="form-input" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Filial logotipi</label>
                <div className="flex-row gap-2 align-center">
                  {logo && <img src={getSecureUrl(logo)} alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="form-input" 
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      const token = localStorage.getItem('accessToken');
                      try {
                        const res = await fetch(`${API_URL}/upload`, {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${token}` },
                          body: formData
                        });
                        const data = await res.json();
                        if (data.success) {
                          setLogo(data.url);
                          addToast('Rasm muvaffaqiyatli yuklandi.', 'success');
                        } else {
                          addToast(data.error || 'Yuklashda xatolik.', 'error');
                        }
                      } catch (err) {
                        addToast('Serverga ulanish xatosi.', 'error');
                      }
                    }} 
                  />
                </div>
              </div>
            </div>

            <div className="form-group flex-row gap-4 align-center mt-2">
              <label className="form-label" style={{ margin: 0 }}>Filial faol holatda:</label>
              <label className="switch">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>

            <div className="flex-row gap-2 justify-end" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Bekor qilish</button>
              <button type="submit" className="btn btn-primary">Saqlash</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', placeContent: 'center', height: '150px' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Logo</th>
                  <th>Nomi</th>
                  <th>Telefon</th>
                  <th>Manzil</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {branches.length > 0 ? branches.map(b => (
                  <tr key={b.id}>
                    <td>
                      {b.logo ? (
                        <img src={getSecureUrl(b.logo)} alt="logo" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--border-color)', display: 'grid', placeContent: 'center', fontWeight: 'bold' }}>
                          {b.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{b.name}</td>
                    <td>{b.phone || '-'}</td>
                    <td>{b.address || '-'}</td>
                    <td>
                      <span className={`badge ${b.isActive !== false ? 'badge-success' : 'badge-danger'}`} style={{ cursor: 'pointer' }} onClick={() => toggleBranchStatus(b)}>
                        {b.isActive !== false ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td>
                      <div className="flex-row gap-2 justify-end">
                        <button className="btn btn-secondary btn-icon" onClick={() => handleEdit(b)} title="Tahrirlash">
                          <Icons.Edit size={16} />
                        </button>
                        <button className="btn btn-danger btn-icon" onClick={() => handleDelete(b.id)} title="O'chirish">
                          <Icons.Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Filiallar topilmadi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- SUPER ADMIN MANAGERS CRUD ----------------
function SuperAdminManagers({ addToast, setModal }) {
  const [managers, setManagers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [editId, setEditId] = useState(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [branchId, setBranchId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    // Fetch users (Managers only)
    const usersRes = await apiCall('/users?limit=100');
    if (usersRes.success) {
      // Filter manager role on frontend just in case
      const allUsers = usersRes.data.rows;
      setManagers(allUsers.filter(u => u.role === 'MANAGER'));
    } else {
      addToast('Menejerlarni yuklashda xatolik.', 'error');
    }

    // Fetch branches
    const branchRes = await apiCall('/branches?limit=100');
    if (branchRes.success) {
      setBranches(branchRes.data.rows);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setFullName('');
    setUsername('');
    setPassword('');
    setBranchId('');
    setIsActive(true);
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName || !username) {
      addToast('Ism-familiya va username majburiy.', 'warning');
      return;
    }
    if (!editId && !password) {
      addToast('Yangi menejer uchun parol kiritilishi shart', 'warning');
      return;
    }

    const payload = {
      fullName,
      username,
      role: 'MANAGER',
      branchId: branchId ? parseInt(branchId) : null,
      isActive
    };
    if (password) {
      payload.password = password;
    }

    let res;
    if (editId) {
      res = await apiCall(`/users/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (res.success) {
      addToast(editId ? 'Menejer ma\'lumotlari yangilandi.' : 'Menejer muvaffaqiyatli yaratildi.', 'success');
      resetForm();
      fetchData();
    } else {
      addToast(res.error || 'Saqlashda xatolik yuz berdi.', 'error');
    }
  };

  const handleEdit = (m) => {
    setEditId(m.id);
    setFullName(m.fullName || '');
    setUsername(m.username || '');
    setBranchId(m.branchId || '');
    setIsActive(m.isActive !== false);
    setPassword(''); // leave blank if no change
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setModal({
      type: 'delete',
      title: 'Menejerni o\'chirish',
      body: 'Ushbu menejerni tizimdan butunlay o\'chirib tashlamoqchimisiz?',
      confirmText: 'O\'chirish',
      onConfirm: async () => {
        const res = await apiCall(`/users/${id}`, { method: 'DELETE' });
        setModal(null);
        if (res.success) {
          addToast('Menejer o\'chirildi.', 'success');
          fetchData();
        } else {
          addToast(res.error || 'Menejerni o\'chirishda xatolik yuz berdi.', 'error');
        }
      }
    });
  };

  const handleResetPassword = (m) => {
    let newPassword = '';
    setModal({
      type: 'update',
      title: `${m.fullName} parolini yangilash`,
      body: (
        <div>
          <label className="form-label">Yangi parol (PIN)</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Kamida 6 ta belgi" 
            onChange={e => newPassword = e.target.value}
          />
        </div>
      ),
      confirmText: 'Parolni o\'zgartirish',
      onConfirm: async () => {
        if (!newPassword || newPassword.length < 6) {
          addToast('Parol kamida 6 belgidan iborat bo\'lishi shart', 'warning');
          return;
        }
        const res = await apiCall(`/users/${m.id}`, {
          method: 'PUT',
          body: JSON.stringify({ password: newPassword })
        });
        setModal(null);
        if (res.success) {
          addToast('Parol muvaffaqiyatli o\'zgartirildi.', 'success');
          fetchData();
        } else {
          addToast(res.error || 'Parol o\'zgartirishda xatolik.', 'error');
        }
      }
    });
  };

  return (
    <div>
      <div className="flex-row justify-between align-center mb-4">
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Menejerlar boshqaruvi</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Filiallarga menejerlar tayinlash va akkauntlarni sozlash</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary gap-2" onClick={() => setShowForm(true)}>
            <Icons.Plus size={18} />
            <span>Yangi Menejer qo'shish</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-4">
          <h4 className="card-title">{editId ? 'Menejerni tahrirlash' : 'Yangi menejer yaratish'}</h4>
          <form onSubmit={handleSave}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Ism-familiya *</label>
                <input type="text" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input type="text" className="form-input" value={username} onChange={e => setUsername(e.target.value)} required disabled={editId !== null} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tegishli filial</label>
                <select className="form-select" value={branchId} onChange={e => setBranchId(e.target.value)}>
                  <option value="">Filialga bog'lanmagan</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{editId ? 'Parol (O\'zgartirish uchun yozing)' : 'Parol *'}</label>
                <input type="text" className="form-input" placeholder="Kamida 6 belgi" value={password} onChange={e => setPassword(e.target.value)} required={editId === null} />
              </div>
            </div>

            <div className="form-group flex-row gap-4 align-center mt-2">
              <label className="form-label" style={{ margin: 0 }}>Akkaunt faol:</label>
              <label className="switch">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>

            <div className="flex-row gap-2 justify-end" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Bekor qilish</button>
              <button type="submit" className="btn btn-primary">Saqlash</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', placeContent: 'center', height: '150px' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>F.I.SH</th>
                  <th>Username</th>
                  <th>Biriktirilgan filial</th>
                  <th>Rol</th>
                  <th>Holat</th>
                  <th style={{ textAlign: 'right' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {managers.length > 0 ? managers.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.fullName}</td>
                    <td>{m.username}</td>
                    <td>
                      {m.Branch ? (
                        <span className="badge badge-info">{m.Branch.name}</span>
                      ) : (
                        <span className="badge badge-warning" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>Filialsiz</span>
                      )}
                    </td>
                    <td>{m.role}</td>
                    <td>
                      <span className={`badge ${m.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                        {m.isActive !== false ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td>
                      <div className="flex-row gap-2 justify-end">
                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => handleResetPassword(m)}>
                          Parolni tiklash
                        </button>
                        <button className="btn btn-secondary btn-icon" onClick={() => handleEdit(m)} title="Tahrirlash">
                          <Icons.Edit size={16} />
                        </button>
                        <button className="btn btn-danger btn-icon" onClick={() => handleDelete(m.id)} title="O'chirish">
                          <Icons.Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Menejerlar mavjud emas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- SUPER ADMIN AUDIT LOGS ----------------
function SuperAdminLogs({ addToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const data = await apiCall('/audit-logs?limit=50');
    if (data.success) {
      setLogs(data.data.rows || []);
    } else {
      addToast('Audit loglarini yuklashda xatolik.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div>
      <div className="flex-row justify-between align-center mb-4">
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Tizim audit loglari</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Foydalanuvchilarning barcha muhim harakatlari tarixi</p>
        </div>
        <button className="btn btn-secondary btn-icon" onClick={fetchLogs} title="Yangilash">
          <Icons.Check size={18} />
          <span>Yangilash</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', placeContent: 'center', height: '150px' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Foydalanuvchi</th>
                  <th>Harakat (Action)</th>
                  <th>IP Manzil</th>
                  <th>Eski ma'lumot</th>
                  <th>Yangi ma'lumot</th>
                  <th>Sana / Vaqt</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.User ? l.User.fullName : 'Tizim / Seeder'}</td>
                    <td>
                      <span className="badge badge-info">{l.action}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{l.ipAddress}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {l.oldData || '-'}
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {l.newData || '-'}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(l.createdAt).toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Loglar topilmadi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


// ---------------- MANAGER DASHBOARD ----------------
function ManagerDashboard({ user, addToast }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchManagerStats = async () => {
      setLoading(true);
      // Stats for own branch
      const res = await apiCall(`/dashboard?branchId=${user.branchId}`);
      if (res.success) {
        setStats(res.data);
      } else {
        addToast('Menejer statistikasini yuklashda xatolik.', 'error');
      }
      setLoading(false);
    };
    fetchManagerStats();
  }, [user.branchId]);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeContent: 'center', height: '300px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Filial Hisoboti</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user.branchName} filiali real-vaqt statistikasi</p>
      </div>

      {stats && (
        <>
          {/* Manager Stats Cards */}
          <div className="stats-grid grid-4">
            <div className="card stat-card">
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Bugungi savdo</div>
                <div className="stat-val">{stats.revenue?.daily?.toLocaleString()} UZS</div>
              </div>
              <div className="stat-icon stat-icon-success"><Icons.DollarSign size={24} /></div>
            </div>
            
            <div className="card stat-card">
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Oylik savdo</div>
                <div className="stat-val">{stats.revenue?.monthly?.toLocaleString()} UZS</div>
              </div>
              <div className="stat-icon stat-icon-info"><Icons.CreditCard size={24} /></div>
            </div>

            <div className="card stat-card">
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Filial xarajatlari</div>
                <div className="stat-val">{stats.expenses?.toLocaleString()} UZS</div>
              </div>
              <div className="stat-icon stat-icon-danger"><Icons.Trash size={24} /></div>
            </div>

            <div className="card stat-card">
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Zaxiradagi tovarlar</div>
                <div className="stat-val">{stats.inventory?.totalStockQuantity} ta</div>
              </div>
              <div className="stat-icon stat-icon-warning"><Icons.ShoppingBag size={24} /></div>
            </div>
          </div>

          <div className="grid-3 mt-4" style={{ marginBottom: '2rem' }}>
            {/* Orders summary */}
            <div className="card">
              <h4 className="card-title">Buyurtmalar monitoringi</h4>
              <div className="flex-column gap-3" style={{ marginTop: '1rem' }}>
                <div className="flex-row justify-between align-center">
                  <span>Jami buyurtmalar</span>
                  <span className="badge badge-info">{stats.orders?.total}</span>
                </div>
                <div className="flex-row justify-between align-center">
                  <span>Pending (Kutilmoqda)</span>
                  <span className="badge badge-warning">{stats.orders?.pending}</span>
                </div>
                <div className="flex-row justify-between align-center">
                  <span>Preparing (Tayyorlanmoqda)</span>
                  <span className="badge badge-info" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)' }}>{stats.orders?.preparing}</span>
                </div>
                <div className="flex-row justify-between align-center">
                  <span>Completed (Bajarildi)</span>
                  <span className="badge badge-success">{stats.orders?.completed}</span>
                </div>
                {stats.inventory?.lowStockItemsCount > 0 && (
                  <div className="flex-row justify-between align-center" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <span style={{ color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Icons.AlertTriangle size={16} /> Kam qolgan mahsulotlar:
                    </span>
                    <span className="badge badge-danger">{stats.inventory?.lowStockItemsCount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Top Waiters */}
            <div className="card">
              <h4 className="card-title">Faol Ofitsiantlar</h4>
              <div className="flex-column gap-2" style={{ marginTop: '1rem' }}>
                {stats.topWaiters?.length > 0 ? stats.topWaiters.map((w, idx) => (
                  <div key={w.userId || idx} className="flex-row justify-between align-center" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span>{idx + 1}. {w.fullName}</span>
                    <span style={{ fontWeight: 600 }}>{w.orderCount} buyurtma ({w.totalRevenue?.toLocaleString()} UZS)</span>
                  </div>
                )) : <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>Ofitsiantlar faoliyati mavjud emas</div>}
              </div>
            </div>

            {/* Top Products */}
            <div className="card">
              <h4 className="card-title">Top 5 Mahsulot</h4>
              <div className="flex-column gap-2" style={{ marginTop: '1rem' }}>
                {stats.topProducts?.length > 0 ? stats.topProducts.map((p, idx) => (
                  <div key={p.productId || idx} className="flex-row justify-between align-center" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span>{idx + 1}. {p.name}</span>
                    <span style={{ fontWeight: 600 }}>{p.totalSoldQuantity} ta</span>
                  </div>
                )) : <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>Sotuvlar mavjud emas</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------- MANAGER EMPLOYEES CRUD ----------------
function ManagerEmployees({ user, addToast, setModal }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [editId, setEditId] = useState(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('WAITER');
  const [isActive, setIsActive] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    const res = await apiCall('/users?limit=100');
    if (res.success) {
      setEmployees(res.data.rows);
    } else {
      addToast('Xodimlarni yuklashda xatolik.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setFullName('');
    setUsername('');
    setPassword('');
    setRole('WAITER');
    setIsActive(true);
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName || !username) {
      addToast('Ism-familiya va username majburiy', 'warning');
      return;
    }
    if (!editId && !password) {
      addToast('Yangi xodim uchun parol (PIN) majburiy', 'warning');
      return;
    }

    const payload = {
      fullName,
      username,
      role,
      branchId: user.branchId,
      isActive
    };
    if (password) {
      payload.password = password;
    }

    let res;
    if (editId) {
      res = await apiCall(`/users/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (res.success) {
      addToast(editId ? 'Xodim yangilandi.' : 'Xodim muvaffaqiyatli qo\'shildi.', 'success');
      resetForm();
      fetchEmployees();
    } else {
      addToast(res.error || 'Xatolik yuz berdi.', 'error');
    }
  };

  const handleEdit = (emp) => {
    setEditId(emp.id);
    setFullName(emp.fullName || '');
    setUsername(emp.username || '');
    setRole(emp.role || 'WAITER');
    setIsActive(emp.isActive !== false);
    setPassword('');
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setModal({
      type: 'delete',
      title: 'Xodimni o\'chirish',
      body: 'Haqiqatan ham ushbu xodimni tizimdan butunlay o\'chirmoqchimisiz?',
      confirmText: 'O\'chirish',
      onConfirm: async () => {
        const res = await apiCall(`/users/${id}`, { method: 'DELETE' });
        setModal(null);
        if (res.success) {
          addToast('Xodim o\'chirildi.', 'success');
          fetchEmployees();
        } else {
          addToast(res.error || 'Xodimni o\'chirishda xatolik.', 'error');
        }
      }
    });
  };

  const toggleEmployeeStatus = async (emp) => {
    const nextStatus = !emp.isActive;
    const res = await apiCall(`/users/${emp.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: nextStatus })
    });
    if (res.success) {
      addToast(nextStatus ? 'Xodim faollashtirildi.' : 'Xodim faolsizlantirildi.', 'success');
      fetchEmployees();
    } else {
      addToast(res.error || 'Xatolik yuz berdi.', 'error');
    }
  };

  return (
    <div>
      <div className="flex-row justify-between align-center mb-4">
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Xodimlar boshqaruvi</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ofitsiantlar, Kassirlar va Oshxona xodimlarini boshqarish</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary gap-2" onClick={() => setShowForm(true)}>
            <Icons.Plus size={18} />
            <span>Yangi xodim qo'shish</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-4">
          <h4 className="card-title">{editId ? 'Xodim ma\'lumotlarini tahrirlash' : 'Yangi xodim qo\'shish'}</h4>
          <form onSubmit={handleSave}>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">To'liq ism-familiya *</label>
                <input type="text" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input type="text" className="form-input" value={username} onChange={e => setUsername(e.target.value)} required disabled={editId !== null} />
              </div>
              <div className="form-group">
                <label className="form-label">{editId ? 'Parol (O\'zgartirish uchun yozing)' : 'Parol (PIN) *'}</label>
                <input type="text" className="form-input" placeholder="Kamida 6 belgi" value={password} onChange={e => setPassword(e.target.value)} required={editId === null} />
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Lavozimi (Rol)</label>
                <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="WAITER">Ofitsiant (Waiter)</option>
                  <option value="CASHIER">Kassir (Cashier)</option>
                  <option value="KITCHEN">Oshxona xodimi (Kitchen)</option>
                </select>
              </div>
              <div className="form-group flex-row gap-4 align-center h-full" style={{ paddingTop: '1.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Faol xodim:</label>
                <label className="switch">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="flex-row gap-2 justify-end" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Bekor qilish</button>
              <button type="submit" className="btn btn-primary">Saqlash</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', placeContent: 'center', height: '150px' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>F.I.SH</th>
                  <th>Username</th>
                  <th>Lavozimi</th>
                  <th>Kirish PIN / Paroli</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {employees.length > 0 ? employees.map(emp => (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: 600 }}>{emp.fullName}</td>
                    <td>{emp.username}</td>
                    <td>
                      <span className={`badge ${emp.role === 'WAITER' ? 'badge-info' : emp.role === 'CASHIER' ? 'badge-success' : 'badge-warning'}`}>
                        {emp.role}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{emp.pinCode || 'Parollangan'}</td>
                    <td>
                      <span className={`badge ${emp.isActive !== false ? 'badge-success' : 'badge-danger'}`} style={{ cursor: 'pointer' }} onClick={() => toggleEmployeeStatus(emp)}>
                        {emp.isActive !== false ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td>
                      <div className="flex-row gap-2 justify-end">
                        <button className="btn btn-secondary btn-icon" onClick={() => handleEdit(emp)} title="Tahrirlash">
                          <Icons.Edit size={16} />
                        </button>
                        <button className="btn btn-danger btn-icon" onClick={() => handleDelete(emp.id)} title="O'chirish">
                          <Icons.Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Filial xodimlari topilmadi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- MANAGER MENU & CATEGORIES CRUD ----------------
function ManagerMenu({ user, addToast, setModal }) {
  const [subTab, setSubTab] = useState('products');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category form states
  const [catEditId, setCatEditId] = useState(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [showCatForm, setShowCatForm] = useState(false);

  // Product form states
  const [prodEditId, setProdEditId] = useState(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [showProdForm, setShowProdForm] = useState(false);

  const fetchMenuData = async () => {
    setLoading(true);
    // Fetch categories
    const catRes = await apiCall('/categories?limit=100');
    if (catRes.success) {
      setCategories(catRes.data.rows || []);
    }
    
    // Fetch products
    const prodRes = await apiCall('/products?limit=100');
    if (prodRes.success) {
      setProducts(prodRes.data.rows || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  // Category Save
  const handleCatSave = async (e) => {
    e.preventDefault();
    if (!catName) {
      addToast('Kategoriya nomi kiritilishi shart', 'warning');
      return;
    }
    const payload = { name: catName, description: catDescription };
    let res;
    if (catEditId) {
      res = await apiCall(`/categories/${catEditId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiCall('/categories', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (res.success) {
      addToast(catEditId ? 'Kategoriya tahrirlandi.' : 'Kategoriya qo\'shildi.', 'success');
      setCatEditId(null);
      setCatName('');
      setCatDescription('');
      setShowCatForm(false);
      fetchMenuData();
    } else {
      addToast(res.error || 'Xatolik yuz berdi.', 'error');
    }
  };

  // Product Save
  const handleProdSave = async (e) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !prodCategoryId) {
      addToast('Nomi, narxi va kategoriyasi majburiy.', 'warning');
      return;
    }
    if (parseFloat(prodPrice) < 0) {
      addToast('Narx 0 dan kichik bo\'lishi mumkin emas', 'warning');
      return;
    }

    const payload = {
      name: prodName,
      price: parseFloat(prodPrice),
      categoryId: parseInt(prodCategoryId),
      imageUrl: prodImageUrl,
      description: prodDescription
    };

    let res;
    if (prodEditId) {
      res = await apiCall(`/products/${prodEditId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiCall('/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (res.success) {
      addToast(prodEditId ? 'Mahsulot tahrirlandi.' : 'Mahsulot qo\'shildi.', 'success');
      setProdEditId(null);
      setProdName('');
      setProdPrice('');
      setProdCategoryId('');
      setProdImageUrl('');
      setProdDescription('');
      setShowProdForm(false);
      fetchMenuData();
    } else {
      addToast(res.error || 'Saqlashda xatolik.', 'error');
    }
  };

  const handleCatDelete = (id) => {
    setModal({
      type: 'delete',
      title: 'Kategoriyani o\'chirish',
      body: 'Ushbu kategoriyani o\'chirish unga tegishli barcha mahsulotlarni ham o\'chirishi mumkin. Rostdan ham o\'chirmoqchimisiz?',
      confirmText: 'O\'chirish',
      onConfirm: async () => {
        const res = await apiCall(`/categories/${id}`, { method: 'DELETE' });
        setModal(null);
        if (res.success) {
          addToast('Kategoriya o\'chirildi.', 'success');
          fetchMenuData();
        } else {
          addToast(res.error || 'O\'chirishda xatolik.', 'error');
        }
      }
    });
  };

  const handleProdDelete = (id) => {
    setModal({
      type: 'delete',
      title: 'Mahsulotni o\'chirish',
      body: 'Haqiqatan ham ushbu taom/ichimlikni menyudan olib tashlamoqchimisiz?',
      confirmText: 'O\'chirish',
      onConfirm: async () => {
        const res = await apiCall(`/products/${id}`, { method: 'DELETE' });
        setModal(null);
        if (res.success) {
          addToast('Mahsulot o\'chirildi.', 'success');
          fetchMenuData();
        } else {
          addToast(res.error || 'O\'chirishda xatolik.', 'error');
        }
      }
    });
  };

  return (
    <div>
      <div className="tab-buttons">
        <button className={`tab-btn ${subTab === 'products' ? 'active' : ''}`} onClick={() => setSubTab('products')}>Mahsulotlar (Menyu)</button>
        <button className={`tab-btn ${subTab === 'categories' ? 'active' : ''}`} onClick={() => setSubTab('categories')}>Kategoriyalar</button>
      </div>

      {subTab === 'categories' ? (
        <div>
          <div className="flex-row justify-between align-center mb-4">
            <h4 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Menyu Kategoriyalari</h4>
            {!showCatForm && (
              <button className="btn btn-primary gap-2" onClick={() => setShowCatForm(true)}>
                <Icons.Plus size={18} />
                <span>Yangi kategoriya</span>
              </button>
            )}
          </div>

          {showCatForm && (
            <div className="card mb-4">
              <h5 className="card-title">{catEditId ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya qo\'shish'}</h5>
              <form onSubmit={handleCatSave}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Kategoriya nomi *</label>
                    <input type="text" className="form-input" value={catName} onChange={e => setCatName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tavsif (Description)</label>
                    <input type="text" className="form-input" value={catDescription} onChange={e => setCatDescription(e.target.value)} />
                  </div>
                </div>
                <div className="flex-row gap-2 justify-end">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowCatForm(false); setCatEditId(null); setCatName(''); setCatDescription(''); }}>Bekor qilish</button>
                  <button type="submit" className="btn btn-primary">Saqlash</button>
                </div>
              </form>
            </div>
          )}

          {loading ? <div className="spinner"></div> : (
            <div className="card">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Kategoriya Nomi</th>
                      <th>Tavsifi</th>
                      <th style={{ textAlign: 'right' }}>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length > 0 ? categories.map(cat => (
                      <tr key={cat.id}>
                        <td style={{ fontWeight: 600 }}>{cat.name}</td>
                        <td>{cat.description || '-'}</td>
                        <td>
                          <div className="flex-row gap-2 justify-end">
                            <button className="btn btn-secondary btn-icon" onClick={() => { setCatEditId(cat.id); setCatName(cat.name); setCatDescription(cat.description || ''); setShowCatForm(true); }}>
                              <Icons.Edit size={16} />
                            </button>
                            <button className="btn btn-danger btn-icon" onClick={() => handleCatDelete(cat.id)}>
                              <Icons.Trash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Kategoriyalar mavjud emas.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex-row justify-between align-center mb-4">
            <h4 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Taom va Ichimliklar Ro'yxati</h4>
            {!showProdForm && (
              <button className="btn btn-primary gap-2" onClick={() => {
                if (categories.length === 0) {
                  addToast('Avval kategoriya yarating!', 'warning');
                  return;
                }
                setShowProdForm(true);
              }}>
                <Icons.Plus size={18} />
                <span>Yangi mahsulot qo'shish</span>
              </button>
            )}
          </div>

          {showProdForm && (
            <div className="card mb-4">
              <h5 className="card-title">{prodEditId ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot qo\'shish'}</h5>
              <form onSubmit={handleProdSave}>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Mahsulot nomi *</label>
                    <input type="text" className="form-input" value={prodName} onChange={e => setProdName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Narxi (UZS) *</label>
                    <PriceInput className="form-input" placeholder="Masalan: 35 000" value={prodPrice} onChange={setProdPrice} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kategoriyasi *</label>
                    <select className="form-select" value={prodCategoryId} onChange={e => setProdCategoryId(e.target.value)} required>
                      <option value="">Kategoriyani tanlang</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Mahsulot rasmi</label>
                    <div className="flex-row gap-2 align-center">
                      {prodImageUrl && <img src={getSecureUrl(prodImageUrl)} alt="Product" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="form-input" 
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          const token = localStorage.getItem('accessToken');
                          try {
                            const res = await fetch(`${API_URL}/upload`, {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${token}` },
                              body: formData
                            });
                            const data = await res.json();
                            if (data.success) {
                              setProdImageUrl(data.url);
                              addToast('Rasm muvaffaqiyatli yuklandi.', 'success');
                            } else {
                              addToast(data.error || 'Yuklashda xatolik.', 'error');
                            }
                          } catch (err) {
                            addToast('Serverga ulanish xatosi.', 'error');
                          }
                        }} 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Qisqacha tavsif (Masalliqlar...)</label>
                    <input type="text" className="form-input" value={prodDescription} onChange={e => setProdDescription(e.target.value)} />
                  </div>
                </div>

                <div className="flex-row gap-2 justify-end">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowProdForm(false); setProdEditId(null); setProdName(''); setProdPrice(''); setProdCategoryId(''); setProdImageUrl(''); setProdDescription(''); }}>Bekor qilish</button>
                  <button type="submit" className="btn btn-primary">Saqlash</button>
                </div>
              </form>
            </div>
          )}

          {loading ? <div className="spinner"></div> : (
            <div className="card">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Rasm</th>
                      <th>Nomi</th>
                      <th>Kategoriya</th>
                      <th>Narxi</th>
                      <th>Tavsifi</th>
                      <th style={{ textAlign: 'right' }}>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length > 0 ? products.map(prod => (
                      <tr key={prod.id}>
                        <td>
                          {prod.imageUrl ? (
                            <img src={getSecureUrl(prod.imageUrl)} alt={prod.name} style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '45px', height: '45px', borderRadius: '8px', backgroundColor: 'var(--border-color)', display: 'grid', placeContent: 'center', color: 'var(--text-secondary)' }}>
                              <Icons.Coffee size={20} />
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{prod.name}</td>
                        <td>
                          <span className="badge badge-info">{prod.Category?.name || 'Kategoriyasiz'}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{parseFloat(prod.price).toLocaleString()} UZS</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{prod.description || '-'}</td>
                        <td>
                          <div className="flex-row gap-2 justify-end">
                            <button className="btn btn-secondary btn-icon" onClick={() => {
                              setProdEditId(prod.id);
                              setProdName(prod.name);
                              setProdPrice(prod.price);
                              setProdCategoryId(prod.categoryId);
                              setProdImageUrl(prod.imageUrl || '');
                              setProdDescription(prod.description || '');
                              setShowProdForm(true);
                            }}>
                              <Icons.Edit size={16} />
                            </button>
                            <button className="btn btn-danger btn-icon" onClick={() => handleProdDelete(prod.id)}>
                              <Icons.Trash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Mahsulotlar topilmadi.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- MANAGER TABLES & VIP ROOMS CRUD ----------------
function ManagerTables({ user, addToast, setModal }) {
  const [subTab, setSubTab] = useState('tables');
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [editId, setEditId] = useState(null);
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [hall, setHall] = useState('Asosiy Zal');
  const [isVip, setIsVip] = useState(false);
  const [pricePerHour, setPricePerHour] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const fetchTables = async () => {
    setLoading(true);
    const res = await apiCall('/tables?limit=100');
    if (res.success) {
      setTables(res.data.rows || []);
    } else {
      addToast('Stollarni yuklashda xatolik.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setTableNumber('');
    setCapacity(4);
    setHall('Asosiy Zal');
    setIsVip(false);
    setPricePerHour(0);
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!tableNumber || !hall) {
      addToast('Raqam va zal kiritilishi shart', 'warning');
      return;
    }
    if (isVip && parseFloat(pricePerHour) < 0) {
      addToast('VIP stol narxi 0 dan kichik bo\'lishi mumkin emas', 'warning');
      return;
    }

    const payload = {
      tableNumber,
      capacity: parseInt(capacity),
      hall,
      isVip,
      pricePerHour: isVip ? parseFloat(pricePerHour) : 0,
      branchId: user.branchId
    };

    let res;
    if (editId) {
      res = await apiCall(`/tables/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiCall('/tables', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (res.success) {
      addToast('Stol muvaffaqiyatli saqlandi.', 'success');
      resetForm();
      fetchTables();
    } else {
      addToast(res.error || 'Saqlashda xatolik yuz berdi.', 'error');
    }
  };

  const handleEdit = (tbl) => {
    setEditId(tbl.id);
    setTableNumber(tbl.tableNumber || '');
    setCapacity(tbl.capacity || 4);
    setHall(tbl.hall || 'Asosiy Zal');
    setIsVip(tbl.isVip || false);
    setPricePerHour(tbl.pricePerHour || 0);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setModal({
      type: 'delete',
      title: 'Stol/VIP Xonani o\'chirish',
      body: 'Haqiqatan ham ushbu stol yoki VIP xonani olib tashlamoqchimisiz?',
      confirmText: 'O\'chirish',
      onConfirm: async () => {
        const res = await apiCall(`/tables/${id}`, { method: 'DELETE' });
        setModal(null);
        if (res.success) {
          addToast('O\'chirildi.', 'success');
          fetchTables();
        } else {
          addToast(res.error || 'O\'chirishda xatolik yuz berdi.', 'error');
        }
      }
    });
  };

  const activeTables = tables.filter(t => !t.isVip);
  const vipRooms = tables.filter(t => t.isVip);

  return (
    <div>
      <div className="tab-buttons">
        <button className={`tab-btn ${subTab === 'tables' ? 'active' : ''}`} onClick={() => setSubTab('tables')}>Oddiy Stollar</button>
        <button className={`tab-btn ${subTab === 'vips' ? 'active' : ''}`} onClick={() => setSubTab('vips')}>VIP Xonalar</button>
      </div>

      <div className="flex-row justify-between align-center mb-4">
        <h4 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          {subTab === 'tables' ? 'Zal Stollari' : 'VIP Xonalar ro\'yxati'}
        </h4>
        {!showForm && (
          <button className="btn btn-primary gap-2" onClick={() => {
            setIsVip(subTab === 'vips');
            setShowForm(true);
          }}>
            <Icons.Plus size={18} />
            <span>{subTab === 'tables' ? 'Stol qo\'shish' : 'VIP Xona qo\'shish'}</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-4" style={{ animation: 'scaleIn 0.2s ease' }}>
          <h5 className="card-title">{editId ? 'Tahrirlash' : 'Yangi stol qo\'shish'}</h5>
          <form onSubmit={handleSave}>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">{isVip ? 'Xona nomi/raqami *' : 'Stol raqami (nomi) *'}</label>
                <input type="text" className="form-input" value={tableNumber} onChange={e => setTableNumber(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Sig'imi (Kishi soni)</label>
                <select className="form-select" value={capacity} onChange={e => setCapacity(e.target.value)}>
                  {[2, 4, 6, 8, 10, 12, 16, 20].map(cap => (
                    <option key={cap} value={cap}>{cap} kishilik</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Zal (Hall)</label>
                <input type="text" className="form-input" value={hall} onChange={e => setHall(e.target.value)} required />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group flex-row gap-4 align-center h-full" style={{ paddingTop: '1.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>VIP Xona (isVip):</label>
                <label className="switch">
                  <input type="checkbox" checked={isVip} onChange={e => setIsVip(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
              
              {isVip && (
                <div className="form-group">
                  <label className="form-label">1 soatlik narxi (UZS) *</label>
                  <PriceInput className="form-input" value={pricePerHour} onChange={setPricePerHour} required />
                </div>
              )}
            </div>

            <div className="flex-row gap-2 justify-end" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Bekor qilish</button>
              <button type="submit" className="btn btn-primary">Saqlash</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="spinner"></div> : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nomi / Raqami</th>
                  <th>Sig'imi</th>
                  <th>Zal</th>
                  {subTab === 'vips' && <th>Soatbay narxi (UZS)</th>}
                  <th>Hozirgi holati</th>
                  <th style={{ textAlign: 'right' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {(subTab === 'tables' ? activeTables : vipRooms).map(tbl => (
                  <tr key={tbl.id}>
                    <td style={{ fontWeight: 600 }}>{tbl.tableNumber}</td>
                    <td>{tbl.capacity} kishilik</td>
                    <td>{tbl.hall}</td>
                    {subTab === 'vips' && (
                      <td style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{parseFloat(tbl.pricePerHour).toLocaleString()} UZS</td>
                    )}
                    <td>
                      <span className={`badge ${tbl.status === 'Available' ? 'badge-success' : tbl.status === 'Occupied' ? 'badge-danger' : 'badge-warning'}`}>
                        {tbl.status === 'Available' ? 'Bo\'sh' : tbl.status === 'Occupied' ? 'Band' : 'Band qilingan'}
                      </span>
                    </td>
                    <td>
                      <div className="flex-row gap-2 justify-end">
                        <button className="btn btn-secondary btn-icon" onClick={() => handleEdit(tbl)}>
                          <Icons.Edit size={16} />
                        </button>
                        <button className="btn btn-danger btn-icon" onClick={() => handleDelete(tbl.id)}>
                          <Icons.Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(subTab === 'tables' ? activeTables : vipRooms).length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Ma'lumotlar topilmadi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- MANAGER INVENTORY & STOCKS ----------------
function ManagerInventory({ user, addToast, setModal }) {
  const [subTab, setSubTab] = useState('inventory');
  const [inventories, setInventories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minLimit, setMinLimit] = useState('');
  const [unit, setUnit] = useState('dona');
  const [showAddForm, setShowAddForm] = useState(false);

  // Stock movement adjustment
  const [selectedInv, setSelectedInv] = useState(null);
  const [adjType, setAdjType] = useState('IN');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');

  const fetchInventoryData = async () => {
    setLoading(true);
    // Fetch inventories
    const invRes = await apiCall('/inventory?limit=100');
    if (invRes.success) {
      setInventories(invRes.data.rows || []);
    }

    // Fetch stock movements
    const movRes = await apiCall('/stock-movements?limit=100');
    if (movRes.success) {
      setMovements(movRes.data.rows || []);
    }

    // Fetch products
    const prodRes = await apiCall('/products?limit=100');
    if (prodRes.success) {
      setProducts(prodRes.data.rows || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const handleCreateInventory = async (e) => {
    e.preventDefault();
    if (!productId || !quantity || !minLimit) {
      addToast('Mahsulot, miqdor va minimum limit kiritilishi shart', 'warning');
      return;
    }
    const payload = {
      productId: parseInt(productId),
      quantity: parseFloat(quantity),
      minLimit: parseFloat(minLimit),
      unit,
      branchId: user.branchId
    };

    const res = await apiCall('/inventory', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      addToast('Mahsulot omborxonaga kiritildi.', 'success');
      setShowAddForm(false);
      setProductId('');
      setQuantity('');
      setMinLimit('');
      setUnit('dona');
      fetchInventoryData();
    } else {
      addToast(res.error || 'Xatolik yuz berdi.', 'error');
    }
  };

  const handleStockAdjust = (inv) => {
    setSelectedInv(inv);
    setAdjQty('');
    setAdjReason('');
    setAdjType('IN');
  };

  const saveStockAdjust = async (e) => {
    e.preventDefault();
    if (!adjQty) {
      addToast('Miqdorni kiriting', 'warning');
      return;
    }

    const payload = {
      inventoryId: selectedInv.id,
      type: adjType,
      quantity: parseFloat(adjQty),
      reason: adjReason || 'Menejer tuzatishi'
    };

    const res = await apiCall('/stock-movements', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      addToast('Ombor miqdori moslashtirildi.', 'success');
      setSelectedInv(null);
      fetchInventoryData();
    } else {
      addToast(res.error || 'Tuzatishda xatolik yuz berdi.', 'error');
    }
  };

  return (
    <div>
      <div className="tab-buttons">
        <button className={`tab-btn ${subTab === 'inventory' ? 'active' : ''}`} onClick={() => setSubTab('inventory')}>Zaxira Holati</button>
        <button className={`tab-btn ${subTab === 'movements' ? 'active' : ''}`} onClick={() => setSubTab('movements')}>Harakatlar Tarixi (Logs)</button>
      </div>

      {subTab === 'inventory' ? (
        <div>
          <div className="flex-row justify-between align-center mb-4">
            <h4 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Ombor Zaxirasi</h4>
            {!showAddForm && (
              <button className="btn btn-primary gap-2" onClick={() => setShowAddForm(true)}>
                <Icons.Plus size={18} />
                <span>Yozuv qo'shish</span>
              </button>
            )}
          </div>

          {showAddForm && (
            <div className="card mb-4">
              <h5 className="card-title">Zaxiraga mahsulot biriktirish</h5>
              <form onSubmit={handleCreateInventory}>
                <div className="grid-4">
                  <div className="form-group">
                    <label className="form-label">Mahsulot *</label>
                    <select className="form-select" value={productId} onChange={e => setProductId(e.target.value)} required>
                      <option value="">Tanlang</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Miqdori *</label>
                    <input type="number" className="form-input" value={quantity} onChange={e => setQuantity(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Minimum limit (Ogohlantirish) *</label>
                    <input type="number" className="form-input" value={minLimit} onChange={e => setMinLimit(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">O'lchov birligi</label>
                    <input type="text" className="form-input" placeholder="dona, kg, litr" value={unit} onChange={e => setUnit(e.target.value)} />
                  </div>
                </div>
                <div className="flex-row gap-2 justify-end">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Bekor qilish</button>
                  <button type="submit" className="btn btn-primary">Saqlash</button>
                </div>
              </form>
            </div>
          )}

          {selectedInv && (
            <div className="card mb-4" style={{ borderColor: 'var(--primary-color)' }}>
              <h5 className="card-title">Zaxirani to'ldirish / kamaytirish: {selectedInv.Product?.name}</h5>
              <form onSubmit={saveStockAdjust}>
                <div className="grid-4">
                  <div className="form-group">
                    <label className="form-label">Turi</label>
                    <select className="form-select" value={adjType} onChange={e => setAdjType(e.target.value)}>
                      <option value="IN">Kirim (Stock IN)</option>
                      <option value="OUT">Chiqim (Stock OUT)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Miqdori *</label>
                    <input type="number" step="any" className="form-input" value={adjQty} onChange={e => setAdjQty(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Sabab (Izoh)</label>
                    <input type="text" className="form-input" placeholder="Tuzatish, yangi tovar kirimi, yaroqsiz..." value={adjReason} onChange={e => setAdjReason(e.target.value)} />
                  </div>
                </div>
                <div className="flex-row gap-2 justify-end">
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedInv(null)}>Bekor qilish</button>
                  <button type="submit" className="btn btn-primary">Tasdiqlash</button>
                </div>
              </form>
            </div>
          )}

          {loading ? <div className="spinner"></div> : (
            <div className="card">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Mahsulot nomi</th>
                      <th>Kategoriya</th>
                      <th>Mavjud miqdor</th>
                      <th>Min limit</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventories.map(inv => {
                      const isLow = parseFloat(inv.quantity) <= parseFloat(inv.minLimit);
                      return (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 600 }}>{inv.Product?.name}</td>
                          <td>{inv.Product?.Category?.name || '-'}</td>
                          <td style={{ fontWeight: 700 }}>{inv.quantity} {inv.unit}</td>
                          <td>{inv.minLimit} {inv.unit}</td>
                          <td>
                            <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`}>
                              {isLow ? 'Zaxira kam qoldi' : 'Etarli'}
                            </span>
                          </td>
                          <td>
                            <div className="flex-row gap-2 justify-end">
                              <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => handleStockAdjust(inv)}>
                                Kirim/Chiqim
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {inventories.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Zaxira yozuvlari topilmadi.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <h4 className="card-title mb-4">Ombor Kirim/Chiqim Tarixi</h4>
          {loading ? <div className="spinner"></div> : (
            <div className="card">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Mahsulot</th>
                      <th>Turi</th>
                      <th>Miqdor</th>
                      <th>Sabab</th>
                      <th>Mas'ul xodim</th>
                      <th>Sana/Vaqt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map(m => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 600 }}>{m.Inventory?.Product?.name || 'O\'chirilgan tovar'}</td>
                        <td>
                          <span className={`badge ${m.type === 'IN' ? 'badge-success' : 'badge-danger'}`}>
                            {m.type === 'IN' ? 'Kirim (IN)' : 'Chiqim (OUT)'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{m.quantity}</td>
                        <td>{m.reason || '-'}</td>
                        <td>{m.User?.fullName || 'Tizim'}</td>
                        <td>{new Date(m.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                    {movements.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Tarix topilmadi.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- MANAGER DISCOUNTS CRUD ----------------
function ManagerDiscounts({ user, addToast, setModal }) {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('Percentage');
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchDiscounts = async () => {
    setLoading(true);
    const res = await apiCall('/discounts?limit=100');
    if (res.success) {
      setDiscounts(res.data.rows || []);
    } else {
      addToast('Chegirmalarni yuklashda xatolik.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setName('');
    setType('Percentage');
    setValue('');
    setCode('');
    setIsActive(true);
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !value) {
      addToast('Nomi va qiymati majburiy', 'warning');
      return;
    }
    const parsedVal = parseFloat(value);
    if (parsedVal <= 0) {
      addToast('Qiymat 0 dan katta bo\'lishi shart', 'warning');
      return;
    }
    if (type === 'Percentage' && parsedVal > 100) {
      addToast('Foiz qiymati 100 dan oshishi mumkin emas', 'warning');
      return;
    }

    const payload = {
      name,
      type,
      value: parseFloat(value),
      code,
      isActive,
      branchId: user.branchId
    };

    let res;
    if (editId) {
      res = await apiCall(`/discounts/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiCall('/discounts', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (res.success) {
      addToast('Muvaffaqiyatli saqlandi.', 'success');
      resetForm();
      fetchDiscounts();
    } else {
      addToast(res.error || 'Saqlashda xatolik.', 'error');
    }
  };

  const handleEdit = (d) => {
    setEditId(d.id);
    setName(d.name || '');
    setType(d.type || 'Percentage');
    setValue(d.value || '');
    setCode(d.code || '');
    setIsActive(d.isActive !== false);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setModal({
      type: 'delete',
      title: 'Chegirma o\'chirish',
      body: 'Ushbu chegirma aksiyasini o\'chirmoqchimisiz?',
      confirmText: 'O\'chirish',
      onConfirm: async () => {
        const res = await apiCall(`/discounts/${id}`, { method: 'DELETE' });
        setModal(null);
        if (res.success) {
          addToast('Chegirma o\'chirildi.', 'success');
          fetchDiscounts();
        } else {
          addToast(res.error || 'Xatolik yuz berdi.', 'error');
        }
      }
    });
  };

  return (
    <div>
      <div className="flex-row justify-between align-center mb-4">
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Aksiyalar & Chegirmalar</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Restoranda chegirma foizlari yoki sobit chegiriladigan summalar</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary gap-2" onClick={() => setShowForm(true)}>
            <Icons.Plus size={18} />
            <span>Yangi chegirma</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-4">
          <h4 className="card-title">{editId ? 'Aksiyani tahrirlash' : 'Yangi aksiya qo\'shish'}</h4>
          <form onSubmit={handleSave}>
            <div className="grid-4">
              <div className="form-group">
                <label className="form-label">Aksiya nomi *</label>
                <input type="text" className="form-input" placeholder="Masalan: Yangi yil chegirmasi" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Turi</label>
                <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                  <option value="Percentage">Foiz (%)</option>
                  <option value="FixedAmount">Sobit Summa (UZS)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Qiymati *</label>
                <PriceInput className="form-input" value={value} onChange={setValue} required />
              </div>
              <div className="form-group">
                <label className="form-label">Kodi (Promo-kod)</label>
                <input type="text" className="form-input" placeholder="PROMO20" value={code} onChange={e => setCode(e.target.value)} />
              </div>
            </div>

            <div className="form-group flex-row gap-4 align-center mt-2">
              <label className="form-label" style={{ margin: 0 }}>Faol holatda:</label>
              <label className="switch">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>

            <div className="flex-row gap-2 justify-end" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Bekor qilish</button>
              <button type="submit" className="btn btn-primary">Saqlash</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="spinner"></div> : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Chegirma nomi</th>
                  <th>Turi</th>
                  <th>Qiymati</th>
                  <th>Promo kodi</th>
                  <th>Holati</th>
                  <th style={{ textAlign: 'right' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td>{d.type === 'Percentage' ? 'Foiz (%)' : 'Summa'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success-color)' }}>
                      {d.value} {d.type === 'Percentage' ? '%' : 'UZS'}
                    </td>
                    <td><code style={{ backgroundColor: 'var(--border-color)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{d.code || 'Mavjud emas'}</code></td>
                    <td>
                      <span className={`badge ${d.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {d.isActive ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td>
                      <div className="flex-row gap-2 justify-end">
                        <button className="btn btn-secondary btn-icon" onClick={() => handleEdit(d)}>
                          <Icons.Edit size={16} />
                        </button>
                        <button className="btn btn-danger btn-icon" onClick={() => handleDelete(d.id)}>
                          <Icons.Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {discounts.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aktiv chegirmalar topilmadi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- MANAGER EXPENSES CRUD ----------------
function ManagerExpenses({ user, addToast, setModal }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    const res = await apiCall('/expenses?limit=100');
    if (res.success) {
      setExpenses(res.data.rows || []);
    } else {
      addToast('Xarajatlarni yuklashda xatolik.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setTitle('');
    setAmount('');
    setDescription('');
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title || !amount) {
      addToast('Xarajat nomi va summasi majburiy.', 'warning');
      return;
    }
    if (parseFloat(amount) <= 0) {
      addToast('Xarajat summasi 0 dan katta bo\'lishi shart', 'warning');
      return;
    }

    const payload = {
      title,
      amount: parseFloat(amount),
      description,
      branchId: user.branchId
    };

    let res;
    if (editId) {
      res = await apiCall(`/expenses/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiCall('/expenses', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (res.success) {
      addToast('Xarajat kiritildi.', 'success');
      resetForm();
      fetchExpenses();
    } else {
      addToast(res.error || 'Saqlashda xatolik.', 'error');
    }
  };

  const handleDelete = (id) => {
    setModal({
      type: 'delete',
      title: 'Xarajatni o\'chirish',
      body: 'Ushbu xarajat yozuvini o\'chirib tashlamoqchimisiz?',
      confirmText: 'O\'chirish',
      onConfirm: async () => {
        const res = await apiCall(`/expenses/${id}`, { method: 'DELETE' });
        setModal(null);
        if (res.success) {
          addToast('Xarajat o\'chirildi.', 'success');
          fetchExpenses();
        } else {
          addToast(res.error || 'O\'chirishda xatolik.', 'error');
        }
      }
    });
  };

  return (
    <div>
      <div className="flex-row justify-between align-center mb-4">
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Xarajatlar nazorati</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Kommunal xarajatlar, oziq-ovqat sotib olish va boshqa chiqimlar hisobi</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary gap-2" onClick={() => setShowForm(true)}>
            <Icons.Plus size={18} />
            <span>Yangi xarajat</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-4">
          <h4 className="card-title">Xarajat kiritish</h4>
          <form onSubmit={handleSave}>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Sarlavha (Nomi) *</label>
                <input type="text" className="form-input" placeholder="Elektr energiyasi uchun..." value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Summasi (UZS) *</label>
                <PriceInput className="form-input" value={amount} onChange={setAmount} required />
              </div>
              <div className="form-group">
                <label className="form-label">Izoh (Description)</label>
                <input type="text" className="form-input" placeholder="Tafsilotlar" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>
            <div className="flex-row gap-2 justify-end">
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Bekor qilish</button>
              <button type="submit" className="btn btn-primary">Saqlash</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="spinner"></div> : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Xarajat nomi</th>
                  <th>Summasi</th>
                  <th>Tavsifi / Izohi</th>
                  <th>Kiritgan xodim</th>
                  <th>Kiritilgan sana</th>
                  <th style={{ textAlign: 'right' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id}>
                    <td style={{ fontWeight: 600 }}>{exp.title}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger-color)' }}>{parseFloat(exp.amount).toLocaleString()} UZS</td>
                    <td>{exp.description || '-'}</td>
                    <td>{exp.User?.fullName || 'Menejer'}</td>
                    <td>{new Date(exp.createdAt).toLocaleString()}</td>
                    <td>
                      <div className="flex-row gap-2 justify-end">
                        <button className="btn btn-secondary btn-icon" onClick={() => {
                          setEditId(exp.id);
                          setTitle(exp.title);
                          setAmount(exp.amount);
                          setDescription(exp.description || '');
                          setShowForm(true);
                        }}>
                          <Icons.Edit size={16} />
                        </button>
                        <button className="btn btn-danger btn-icon" onClick={() => handleDelete(exp.id)}>
                          <Icons.Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Hozircha xarajatlar mavjud emas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- MANAGER SETTINGS & PRINTERS ----------------
function ManagerSettings({ user, addToast, setModal }) {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [type, setType] = useState('Receipt');
  const [showForm, setShowForm] = useState(false);

  const fetchPrinters = async () => {
    setLoading(true);
    const res = await apiCall('/printers?limit=100');
    if (res.success) {
      setPrinters(res.data.rows || []);
    } else {
      addToast('Printerni yuklashda xatolik yuz berdi.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPrinters();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setName('');
    setIpAddress('');
    setType('Receipt');
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !type) {
      addToast('Printer nomi va turi kiritilishi shart', 'warning');
      return;
    }

    const payload = {
      name,
      ipAddress,
      type,
      branchId: user.branchId
    };

    let res;
    if (editId) {
      res = await apiCall(`/printers/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiCall('/printers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (res.success) {
      addToast('Printer sozlamasi saqlandi.', 'success');
      resetForm();
      fetchPrinters();
    } else {
      addToast(res.error || 'Saqlashda xatolik.', 'error');
    }
  };

  const handleDelete = (id) => {
    setModal({
      type: 'delete',
      title: 'Printerni o\'chirish',
      body: 'Rostdan ham ushbu printer bog\'lanmasini o\'chirib tashlamoqchimisiz?',
      confirmText: 'O\'chirish',
      onConfirm: async () => {
        const res = await apiCall(`/printers/${id}`, { method: 'DELETE' });
        setModal(null);
        if (res.success) {
          addToast('Printer o\'chirildi.', 'success');
          fetchPrinters();
        } else {
          addToast(res.error || 'Xatolik yuz berdi.', 'error');
        }
      }
    });
  };

  return (
    <div>
      <div className="flex-row justify-between align-center mb-4">
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Printerlar & Uskunalar</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>USB, LAN Chek printerlari, Kassa printerlari sozlamalari</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary gap-2" onClick={() => setShowForm(true)}>
            <Icons.Plus size={18} />
            <span>Yangi printer</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-4">
          <h4 className="card-title">Printer qo'shish</h4>
          <form onSubmit={handleSave}>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Printer nomi *</label>
                <input type="text" className="form-input" placeholder="XPRINTER-80, Kassa printeri" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">IP manzili (Agar LAN bo'lsa)</label>
                <input type="text" className="form-input" placeholder="192.168.1.100" value={ipAddress} onChange={e => setIpAddress(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Printer turi (Qayerga chop etadi)</label>
                <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                  <option value="Receipt">Kassa printeri (Receipt)</option>
                  <option value="Kitchen">Oshxona printeri (Kitchen)</option>
                </select>
              </div>
            </div>
            <div className="flex-row gap-2 justify-end">
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Bekor qilish</button>
              <button type="submit" className="btn btn-primary">Saqlash</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="spinner"></div> : (
        <div className="card">
          <h4 className="card-title">Ulangan printerlar ro'yxati</h4>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Printer nomi</th>
                  <th>Ulanish turi</th>
                  <th>IP manzil (LAN)</th>
                  <th>Turi (Joylashuv)</th>
                  <th style={{ textAlign: 'right' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {printers.map(pr => (
                  <tr key={pr.id}>
                    <td style={{ fontWeight: 600 }}>{pr.name}</td>
                    <td>{pr.ipAddress ? 'LAN (Ethernet)' : 'USB / Mahalliy'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{pr.ipAddress || 'USB'}</td>
                    <td>
                      <span className={`badge ${pr.type === 'Receipt' ? 'badge-success' : 'badge-info'}`}>
                        {pr.type === 'Receipt' ? 'Kassa cheki' : 'Oshxona buyurtmasi'}
                      </span>
                    </td>
                    <td>
                      <div className="flex-row gap-2 justify-end">
                        <button className="btn btn-secondary btn-icon" onClick={() => {
                          setEditId(pr.id);
                          setName(pr.name);
                          setIpAddress(pr.ipAddress || '');
                          setType(pr.type);
                          setShowForm(true);
                        }}>
                          <Icons.Edit size={16} />
                        </button>
                        <button className="btn btn-danger btn-icon" onClick={() => handleDelete(pr.id)}>
                          <Icons.Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {printers.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Uskunalar sozlanmagan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- 13. MANAGER NOTIFICATIONS ----------------
function ManagerNotifications({ user, addToast }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    const res = await apiCall('/notifications?limit=50');
    if (res.success) {
      setNotifications(res.data.rows || []);
    } else {
      addToast(res.error || 'Xatolik', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const markAsRead = async (id) => {
    const res = await apiCall(`/notifications/${id}/read`, { method: 'PUT' });
    if (res.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }
  };

  const deleteNotif = async (id) => {
    const res = await apiCall(`/notifications/${id}`, { method: 'DELETE' });
    if (res.success) {
      addToast('O\'chirildi', 'success');
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  return (
    <div>
      <div className="flex-row justify-between align-center mb-4">
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Bildirishnomalar</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tizimdagi barcha ogohlantirish va bekor qilingan buyurtmalar</p>
        </div>
        <button className="btn btn-secondary btn-icon" onClick={fetchNotifs}>
          <Icons.RefreshCw size={18} />
          <span>Yangilash</span>
        </button>
      </div>

      <div className="card p-0">
        {loading ? (
          <div style={{ display: 'grid', placeContent: 'center', height: '200px' }}>
            <div className="spinner"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Hozircha bildirishnomalar yo'q.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Vaqt</th>
                <th>Xabar</th>
                <th>Holat</th>
                <th style={{ textAlign: 'right' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map(n => (
                <tr key={n.id} style={{ opacity: n.isRead ? 0.7 : 1, backgroundColor: n.isRead ? 'transparent' : 'rgba(255, 60, 60, 0.05)', cursor: n.isRead ? 'default' : 'pointer' }} onClick={() => !n.isRead && markAsRead(n.id)}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(n.createdAt).toLocaleString()}</td>
                  <td style={{ maxWidth: '400px', whiteSpace: 'normal', fontWeight: n.isRead ? 400 : 600 }}>{n.message}</td>
                  <td>
                    {n.isRead ? <span className="badge badge-success">O'qilgan</span> : <span className="badge badge-danger">Yangi</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex-row gap-2 justify-end">
                      {!n.isRead && (
                        <button className="btn btn-secondary btn-icon" onClick={() => markAsRead(n.id)} title="O'qildi deb belgilash">
                          <Icons.Check size={16} />
                        </button>
                      )}
                      <button className="btn btn-secondary btn-icon" style={{ color: 'var(--danger-color)' }} onClick={() => deleteNotif(n.id)} title="O'chirish">
                        <Icons.Delete size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

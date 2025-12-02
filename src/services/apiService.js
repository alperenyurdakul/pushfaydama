import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config/api';

// API Base URL - config'den alınır
const API_BASE_URL = API_CONFIG.BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Her istekte token ekle
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Token okuma hatası:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - 401 hatası geldiğinde otomatik logout
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      console.log('🚨 401 Hatası - Token geçersiz, cache temizleniyor...');
      
      // AsyncStorage'ı temizle
      try {
        await AsyncStorage.multiRemove([
          'authToken',
          'userData',
          'isLoggedIn',
          'userPhone'
        ]);
        console.log('✅ Cache temizlendi, kullanıcı logout yapıldı');
      } catch (clearError) {
        console.error('❌ Cache temizleme hatası:', clearError);
      }
    }
    return Promise.reject(error);
  }
);

// Dashboard Login - Brand ve Admin için
export const dashboardLogin = async (phone, password) => {
  try {
    const response = await api.post('/api/auth/login', {
      phone,
      password
    });
    return response.data;
  } catch (error) {
    console.error('Dashboard login error:', error);
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

// Dashboard Register - Brand kaydı
export const dashboardRegister = async (data) => {
  try {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  } catch (error) {
    console.error('Dashboard register error:', error);
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

// Banner'ları getir
export const fetchBanners = async () => {
  try {
    const response = await api.get('/api/ai/banners');
    return response.data;
  } catch (error) {
    console.error('Fetch banners error:', error);
    throw error;
  }
};

// Müşteri kodunu doğrula
export const verifyCustomerCode = async (code, bannerId, billAmount = null) => {
  try {
    const response = await api.post('/api/ai/verify-customer-code', {
      code,
      bannerId,
      billAmount
    });
    return response.data;
  } catch (error) {
    console.error('Verify code error:', error);
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

// Brand bilgilerini güncelle
export const updateBrandProfile = async (data) => {
  try {
    const response = await api.put('/api/auth/update-profile', data);
    return response.data;
  } catch (error) {
    console.error('Update brand profile error:', error);
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

// Analytics verilerini getir
export const fetchAnalytics = async (period = 'weekly') => {
  try {
    const endpoint = period === 'weekly' 
      ? '/api/analytics/brand-weekly' 
      : '/api/analytics/brand-daily';
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    console.error('Fetch analytics error:', error);
    throw error;
  }
};

// Admin - Bekleyen banner'ları getir
export const fetchPendingBanners = async () => {
  try {
    const response = await api.get('/api/admin/banners/pending');
    return response.data;
  } catch (error) {
    console.error('Fetch pending banners error:', error);
    throw error;
  }
};

// Admin - Banner onayla
export const approveBanner = async (bannerId) => {
  try {
    const response = await api.post(`/api/admin/banners/${bannerId}/approve`);
    return response.data;
  } catch (error) {
    console.error('Approve banner error:', error);
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

// Admin - Banner reddet
export const rejectBanner = async (bannerId, reason) => {
  try {
    const response = await api.post(`/api/admin/banners/${bannerId}/reject`, { reason });
    return response.data;
  } catch (error) {
    console.error('Reject banner error:', error);
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

// Admin - İstatistikleri getir
export const fetchAdminStats = async () => {
  try {
    const response = await api.get('/api/admin/stats');
    return response.data;
  } catch (error) {
    console.error('Fetch admin stats error:', error);
    throw error;
  }
};

// Banner oluştur
export const createBanner = async (bannerData) => {
  try {
    const response = await api.post('/api/ai/generate-banner', bannerData);
    return response.data;
  } catch (error) {
    console.error('Create banner error:', error);
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

// Banner güncelle
export const updateBanner = async (bannerId, bannerData) => {
  try {
    const response = await api.put(`/api/banners/${bannerId}`, bannerData);
    return response.data;
  } catch (error) {
    console.error('Update banner error:', error);
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

// Banner sil
export const deleteBanner = async (bannerId, restaurantName) => {
  try {
    const response = await api.delete(`/api/ai/banners/${bannerId}?restaurantName=${encodeURIComponent(restaurantName)}`);
    return response.data;
  } catch (error) {
    console.error('Delete banner error:', error);
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

export default api;


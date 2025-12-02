// API Configuration - Dashboard Mobile için
const API_CONFIG = {
  // API Domain - tek yerden yönetim
  API_DOMAIN: 'https://api.faydana.com',
  
  // API Base URL - otomatik oluşturulur
  get BASE_URL() {
    return this.API_DOMAIN;
  }
};

export default API_CONFIG;


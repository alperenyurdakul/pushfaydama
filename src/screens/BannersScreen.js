import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Dimensions,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { fetchBanners, verifyCustomerCode, createBanner, updateBanner, deleteBanner } from '../services/apiService';
import theme from '../theme';
import API_CONFIG from '../config/api';

const { width } = Dimensions.get('window');

export default function BannersScreen({ currentUser }) {
  const [activeTab, setActiveTab] = useState(0); // 0: Banner Yönetimi, 1: QR Kod Doğrulama
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [selectedBannerForVerification, setSelectedBannerForVerification] = useState(null); // QR doğrulama için seçilen banner
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [codeInputMode, setCodeInputMode] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [billAmountModalVisible, setBillAmountModalVisible] = useState(false);
  const [billAmount, setBillAmount] = useState('');
  const [pendingCode, setPendingCode] = useState(null);
  
  // Banner oluşturma/düzenleme state'leri
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    campaignDescription: '',
    targetAudience: 'Genel kitle',
    category: '',
    codeQuota: 10,
    codeType: 'random',
    fixedCode: '',
    offerType: 'percentage',
    discountPercentage: 20,
    originalPrice: '',
    discountedPrice: '',
    freeItemName: '',
    freeItemCondition: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '23:00',
    location: {
      city: '',
      district: '',
      address: '',
      coordinates: { latitude: null, longitude: null }
    },
    brandInfo: {
      name: '',
      type: 'restaurant',

      description: ''
    },
    menu: {
      link: '',
      image: null
    },
    bannerImage: null
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadBanners();
  }, [currentUser]);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const response = await fetchBanners();
      
      if (response.success && response.data) {
        // Sadece kendi banner'larını filtrele
        const myBanners = response.data.filter(banner => 
          banner.restaurant?.name === currentUser?.name
        );
        setBanners(myBanners);
      }
    } catch (error) {
      console.error('Banner yükleme hatası:', error);
      Alert.alert('Hata', 'Kampanyalar yüklenirken bir hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBanners();
    setRefreshing(false);
  };

  const handleVerifyCode = (banner) => {
    setSelectedBanner(banner);
    setSelectedBannerForVerification(banner);
    setVerifyCode('');
    setCodeInputMode(false);
    setVerifyModalVisible(true);
  };

  const handleSelectBannerForVerification = (banner) => {
    setSelectedBannerForVerification(banner);
    setVerifyCode('');
    setCodeInputMode(false);
    setVerifyModalVisible(true);
  };

  const handleCodeInputMode = () => {
    setCodeInputMode(true);
    setScannerVisible(false);
  };

  const requestCameraPermission = async () => {
    try {
      // Mevcut izin durumunu kontrol et
      if (!permission) {
        // İzin durumu henüz yüklenmedi, bekle
        console.log('⏳ Kamera izin durumu yükleniyor...');
        return;
      }

      if (!permission.granted) {
        // İzin yok, iste
        const result = await requestPermission();
        if (result && result.granted) {
          setHasPermission(true);
          setVerifyModalVisible(false);
          // Kısa bir gecikme ile scanner'ı aç (izin state'inin güncellenmesi için)
          setTimeout(() => {
            setScannerVisible(true);
          }, 100);
        } else {
          setHasPermission(false);
          Alert.alert('İzin Gerekli', 'Kamera izni gerekiyor QR kod okumak için!');
        }
      } else {
        // İzin var, direkt aç
        setHasPermission(true);
        setVerifyModalVisible(false);
        setTimeout(() => {
          setScannerVisible(true);
        }, 100);
      }
    } catch (error) {
      console.error('Kamera izni hatası:', error);
      Alert.alert('Hata', 'Kamera izni alınamadı!');
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return; // Zaten taranmışsa tekrar tarama
    
    setScanned(true);
    setScannerVisible(false);
    setPendingCode(data);
    setBillAmountModalVisible(true);
  };

  const handleVerifySubmit = async () => {
    if (!verifyCode.trim()) {
      Alert.alert('Hata', 'Lütfen doğrulanacak kodu girin!');
      return;
    }

    const bannerToUse = selectedBannerForVerification || selectedBanner;
    if (!bannerToUse) {
      Alert.alert('Hata', 'Lütfen önce bir banner seçin!');
      return;
    }

    setVerifyLoading(true);
    try {
      const response = await verifyCustomerCode(verifyCode, bannerToUse._id || bannerToUse.id);
      
      if (response.success) {
        let message = `✅ Kod başarıyla doğrulandı!\n\n👤 Müşteri: ${response.data.customerPhone}`;
        
        const offerType = response.data.offerType || 'percentage';
        const billAmount = response.data.billAmount;
        
        if (offerType === 'percentage' && billAmount) {
          message += `\n\n💰 Hesap Bilgileri:`;
          message += `\n• Toplam: ${billAmount.originalAmount} TL`;
          message += `\n• Ödenecek: ${billAmount.discountedAmount} TL`;
          message += `\n• İndirim: ${billAmount.savedAmount} TL (${response.data.offerDetails?.discountPercentage}%)`;
        } else if (offerType === 'fixedPrice') {
          const original = response.data.offerDetails?.originalPrice || 0;
          const discounted = response.data.offerDetails?.discountedPrice || 0;
          message += `\n\n💰 Kampanya:`;
          message += `\n• Kampanyalı Fiyat: ${discounted} TL`;
          message += `\n• Normal Fiyat: ${original} TL`;
          message += `\n• Kazanç: ${original - discounted} TL`;
        } else if (offerType === 'freeItem') {
          message += `\n\n🎁 Kampanya:`;
          message += `\n• ${response.data.offerDetails?.freeItemCondition}`;
          message += `\n• ${response.data.offerDetails?.freeItemName} BEDAVA!`;
        }
        
        setSuccessMessage(message);
        setVerifyModalVisible(false);
        setSuccessModalVisible(true);
        setVerifyCode('');
        loadBanners();
      } else {
        Alert.alert('Hata', response.message || 'Kod doğrulama başarısız!');
      }
    } catch (error) {
      console.error('Kod doğrulama hatası:', error);
      Alert.alert('Hata', 'Sunucu hatası!');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyCodeWithAmount = async (code, billAmountValue) => {
    const bannerToUse = selectedBannerForVerification || selectedBanner;
    if (!code || !bannerToUse) {
      Alert.alert('Hata', 'Kod veya banner bilgisi eksik!');
      return;
    }

    setVerifyLoading(true);
    try {
      const response = await verifyCustomerCode(code, bannerToUse._id || bannerToUse.id, billAmountValue);
      
      if (response.success) {
        // Backend'den gelen bilgileri kullan
        const billAmount = response.data.billAmount;
        const message = `💰 Hesap Tutarı: ${billAmount?.originalAmount || billAmountValue} TL\n💵 Ödenecek Tutar: ${billAmount?.discountedAmount || billAmountValue} TL`;
        
        setSuccessMessage(message);
        setVerifyModalVisible(false);
        setSuccessModalVisible(true);
        setVerifyCode('');
        loadBanners();
      } else {
        Alert.alert('Hata', response.message || 'Kod doğrulama başarısız!');
      }
    } catch (error) {
      console.error('Kod doğrulama hatası:', error);
      Alert.alert('Hata', 'Sunucu hatası!');
    } finally {
      setVerifyLoading(false);
    }
  };

  const getStatusIcon = (approvalStatus) => {
    switch (approvalStatus) {
      case 'approved':
        return <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />;
      case 'pending':
        return <Ionicons name="time" size={20} color="#FFA726" />;
      case 'rejected':
        return <Ionicons name="close-circle" size={20} color="#E53935" />;
      default:
        return <Ionicons name="time" size={20} color="#FFA726" />;
    }
  };

  const getStatusText = (approvalStatus) => {
    switch (approvalStatus) {
      case 'approved':
        return 'Aktif';
      case 'pending':
        return 'Onay Bekliyor';
      case 'rejected':
        return 'Reddedildi';
      default:
        return 'Onay Bekliyor';
    }
  };

  const getStatusColor = (approvalStatus) => {
    switch (approvalStatus) {
      case 'approved':
        return '#4CAF50';
      case 'pending':
        return '#FFA726';
      case 'rejected':
        return '#E53935';
      default:
        return '#FFA726';
    }
  };

  const renderBannerItem = ({ item }) => {
    const rawLogo = item.brandProfile?.logo || item.restaurant?.logo || currentUser?.logo;
    const logoUri = rawLogo
      ? (rawLogo.startsWith('http') ? rawLogo : `${API_CONFIG.BASE_URL}/uploads/logos/${rawLogo}`)
      : null;
    
    const statusColor = getStatusColor(item.approvalStatus);
    const statusText = getStatusText(item.approvalStatus);
    
    return (
      <View style={styles.modernBannerCard}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '40' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
        </View>

        {/* Header */}
        <View style={styles.bannerCardHeader}>
          <View style={styles.bannerCardLogoContainer}>
          {rawLogo ? (
            <Image 
              source={{ uri: logoUri }}
                style={styles.bannerCardLogo}
                resizeMode="cover"
            />
          ) : (
              <View style={styles.bannerCardLogoPlaceholder}>
                <Ionicons name="storefront" size={24} color={theme.colors.primary} />
            </View>
          )}
        </View>
          <View style={styles.bannerCardHeaderContent}>
            <Text style={styles.modernBannerTitle} numberOfLines={2}>
            {item.title || 'Başlıksız Kampanya'}
          </Text>
            <Text style={styles.modernBannerDescription} numberOfLines={2}>
            {item.description || 'Açıklama yok'}
          </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.modernBannerStats}>
          <View style={styles.modernStatItem}>
            <View style={[styles.modernStatIcon, { backgroundColor: '#3B82F615' }]}>
              <Ionicons name="eye" size={16} color="#3B82F6" />
            </View>
            <View style={styles.modernStatContent}>
              <Text style={styles.modernStatValue}>{item.stats?.views || 0}</Text>
              <Text style={styles.modernStatLabel}>Görüntülenme</Text>
            </View>
          </View>
          <View style={styles.modernStatDivider} />
          <View style={styles.modernStatItem}>
            <View style={[styles.modernStatIcon, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="hand-left" size={16} color="#10B981" />
            </View>
            <View style={styles.modernStatContent}>
              <Text style={styles.modernStatValue}>{item.stats?.clicks || 0}</Text>
              <Text style={styles.modernStatLabel}>Tıklama</Text>
            </View>
          </View>
          <View style={styles.modernStatDivider} />
          <View style={styles.modernStatItem}>
            <View style={[styles.modernStatIcon, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="ticket" size={16} color="#F59E0B" />
            </View>
            <View style={styles.modernStatContent}>
              <Text style={styles.modernStatValue}>{item.codeQuota?.used || 0}/{item.codeQuota?.total || 0}</Text>
              <Text style={styles.modernStatLabel}>Kod</Text>
            </View>
            </View>
          </View>

        {/* Action Buttons */}
        <View style={styles.modernActionButtons}>
          {item.approvalStatus === 'approved' && (
            <TouchableOpacity
              style={[styles.modernActionButton, styles.modernVerifyButton]}
              onPress={() => handleVerifyCode(item)}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.modernActionButtonText}>Kod Doğrula</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.modernActionButton, styles.modernEditButton]}
            onPress={() => handleEditBanner(item)}
          >
            <Ionicons name="create" size={18} color="#fff" />
            <Text style={styles.modernActionButtonText}>Düzenle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modernActionButton, styles.modernDeleteButton]}
            onPress={() => handleDeleteBanner(item)}
          >
            <Ionicons name="trash" size={18} color="#fff" />
            <Text style={styles.modernActionButtonText}>Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.modernEmptyContainer}>
      <View style={styles.modernEmptyIconContainer}>
        <Ionicons name="images-outline" size={64} color="#D1D5DB" />
      </View>
      <Text style={styles.modernEmptyTitle}>Henüz kampanya yok</Text>
      <Text style={styles.modernEmptySubtext}>
        İlk kampanyanızı oluşturmak için yukarıdaki "Yeni" butonuna tıklayın
      </Text>
    </View>
  );

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleCreateBanner = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Hata', 'Kampanya başlığı gerekli!');
      return;
    }

    if (!formData.campaignDescription.trim()) {
      Alert.alert('Hata', 'Kampanya açıklaması gerekli!');
      return;
    }

    // Sabit kod validasyonu
    if (formData.codeType === 'fixed') {
      if (!formData.fixedCode || formData.fixedCode.length < 4 || formData.fixedCode.length > 20) {
        Alert.alert('Hata', 'Sabit kod 4-20 karakter arası olmalıdır!');
        return;
      }
      if (!/^[a-zA-Z0-9]+$/.test(formData.fixedCode)) {
        Alert.alert('Hata', 'Sabit kod sadece harf ve rakam içerebilir!');
        return;
      }
    }

    setFormLoading(true);
    try {
      const bannerData = {
        restaurantName: currentUser.name,
        title: formData.title,
        campaignDescription: formData.campaignDescription,
        targetAudience: formData.targetAudience,
        location: formData.location,
        brandInfo: {
          ...formData.brandInfo,
          name: currentUser.name
        },
        category: formData.category,
        codeQuota: formData.codeQuota,
        codeSettings: {
          codeType: formData.codeType,
          fixedCode: formData.codeType === 'fixed' ? formData.fixedCode : null
        },
        offerType: formData.offerType,
        offerDetails: {
          discountPercentage: formData.offerType === 'percentage' ? formData.discountPercentage : null,
          originalPrice: formData.offerType === 'fixedPrice' ? parseFloat(formData.originalPrice) : null,
          discountedPrice: formData.offerType === 'fixedPrice' ? parseFloat(formData.discountedPrice) : null,
          freeItemName: formData.offerType === 'freeItem' ? formData.freeItemName : null,
          freeItemCondition: formData.offerType === 'freeItem' ? formData.freeItemCondition : null
        },
        campaign: {
          startDate: formData.startDate,
          endDate: formData.endDate,
          startTime: formData.startTime,
          endTime: formData.endTime
        },
        menu: formData.menu,
        bannerImage: formData.bannerImage
      };

      const result = await createBanner(bannerData);
      
      if (result.success) {
        Alert.alert('Başarılı', 'Banner oluşturuldu! Admin onayı bekliyor.');
        setCreateModalVisible(false);
        loadBanners();
        // Form'u sıfırla
        const defaultCategory = currentUser?.category || (currentUser?.userType === 'eventBrand' ? 'Konser' : 'Kahve');
        setFormData({
          ...formData,
          title: '',
          campaignDescription: '',
          category: defaultCategory,
          codeQuota: 10,
          codeType: 'random',
          fixedCode: '',
          discountPercentage: 20,
          originalPrice: '',
          discountedPrice: '',
          freeItemName: '',
          freeItemCondition: '',
          bannerImage: null
        });
      } else {
        Alert.alert('Hata', result.message || 'Banner oluşturulamadı!');
      }
    } catch (error) {
      console.error('Banner oluşturma hatası:', error);
      Alert.alert('Hata', 'Banner oluşturulurken bir hata oluştu!');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditBanner = (banner) => {
    setEditingBanner(banner);
    const campaign = banner.campaign || {};
    const offerDetails = banner.offerDetails || {};
    const codeSettings = banner.codeSettings || {};
    
    setFormData({
      title: banner.title || '',
      campaignDescription: banner.description || '',
      targetAudience: banner.targetAudience || 'Genel kitle',
      category: banner.category || currentUser?.category || 'Kahve',
      codeQuota: banner.codeQuota?.total || 10,
      codeType: codeSettings.codeType || 'random',
      fixedCode: codeSettings.fixedCode || '',
      offerType: banner.offerType || 'percentage',
      discountPercentage: offerDetails.discountPercentage || 20,
      originalPrice: offerDetails.originalPrice || '',
      discountedPrice: offerDetails.discountedPrice || '',
      freeItemName: offerDetails.freeItemName || '',
      freeItemCondition: offerDetails.freeItemCondition || '',
      startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      startTime: campaign.startTime || '09:00',
      endTime: campaign.endTime || '23:00',
      location: {
        city: banner.bannerLocation?.city || currentUser?.city || 'İstanbul',
        district: banner.bannerLocation?.district || currentUser?.district || 'Kadıköy',
        address: banner.bannerLocation?.address || currentUser?.address || '',
        coordinates: {
          latitude: banner.bannerLocation?.coordinates?.latitude || currentUser?.latitude || null,
          longitude: banner.bannerLocation?.coordinates?.longitude || currentUser?.longitude || null
        }
      },
      brandInfo: {
        name: currentUser?.name || '',
        type: currentUser?.brandType || 'restaurant',
        description: currentUser?.description || ''
      },
      menu: banner.menu || {
        link: '',
        image: null
      },
      bannerImage: banner.bannerImage || null
    });
    
    setEditModalVisible(true);
  };

  const handleUpdateBanner = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Hata', 'Kampanya başlığı gerekli!');
      return;
    }

    if (!formData.campaignDescription.trim()) {
      Alert.alert('Hata', 'Kampanya açıklaması gerekli!');
      return;
    }

    // Sabit kod validasyonu
    if (formData.codeType === 'fixed') {
      if (!formData.fixedCode || formData.fixedCode.length < 4 || formData.fixedCode.length > 20) {
        Alert.alert('Hata', 'Sabit kod 4-20 karakter arası olmalıdır!');
        return;
      }
      if (!/^[a-zA-Z0-9]+$/.test(formData.fixedCode)) {
        Alert.alert('Hata', 'Sabit kod sadece harf ve rakam içerebilir!');
        return;
      }
    }

    setFormLoading(true);
    try {
      const bannerData = {
        title: formData.title,
        description: formData.campaignDescription,
        targetAudience: formData.targetAudience,
        category: formData.category,
        codeQuota: {
          total: formData.codeQuota,
          used: editingBanner.codeQuota?.used || 0,
          remaining: formData.codeQuota - (editingBanner.codeQuota?.used || 0)
        },
        codeSettings: {
          codeType: formData.codeType,
          fixedCode: formData.codeType === 'fixed' ? formData.fixedCode : null
        },
        offerType: formData.offerType,
        offerDetails: {
          discountPercentage: formData.offerType === 'percentage' ? formData.discountPercentage : null,
          originalPrice: formData.offerType === 'fixedPrice' ? parseFloat(formData.originalPrice) : null,
          discountedPrice: formData.offerType === 'fixedPrice' ? parseFloat(formData.discountedPrice) : null,
          freeItemName: formData.offerType === 'freeItem' ? formData.freeItemName : null,
          freeItemCondition: formData.offerType === 'freeItem' ? formData.freeItemCondition : null
        },
        campaign: {
          startDate: formData.startDate,
          endDate: formData.endDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          daysOfWeek: editingBanner.campaign?.daysOfWeek || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          isActive: true
        },
        bannerLocation: {
          city: formData.location.city,
          district: formData.location.district,
          address: formData.location.address,
          coordinates: formData.location.coordinates.latitude && formData.location.coordinates.longitude ? {
            latitude: formData.location.coordinates.latitude,
            longitude: formData.location.coordinates.longitude
          } : null
        },
        menu: formData.menu,
        bannerImage: formData.bannerImage,
        approvalStatus: 'pending' // Düzenleme sonrası admin onayına gönder
      };

      const result = await updateBanner(editingBanner._id || editingBanner.id, bannerData);
      
      if (result.success) {
        Alert.alert('Başarılı', 'Banner güncellendi! Admin onayı bekliyor.');
        setEditModalVisible(false);
        setEditingBanner(null);
        loadBanners();
      } else {
        Alert.alert('Hata', result.message || 'Banner güncellenemedi!');
      }
    } catch (error) {
      console.error('Banner güncelleme hatası:', error);
      Alert.alert('Hata', 'Banner güncellenirken bir hata oluştu!');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteBanner = (banner) => {
    Alert.alert(
      'Banner Sil',
      'Bu banner\'ı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteBanner(banner._id || banner.id, currentUser.name);
              if (result.success || result === '') {
                Alert.alert('Başarılı', 'Banner silindi!');
                loadBanners();
              } else {
                Alert.alert('Hata', result.message || 'Banner silinemedi!');
              }
            } catch (error) {
              console.error('Banner silme hatası:', error);
              Alert.alert('Hata', 'Banner silinirken bir hata oluştu!');
            }
          }
        }
      ]
    );
  };

  // QR Doğrulama için onaylanmış bannerları filtrele
  const approvedBanners = banners.filter(b => b.approvalStatus === 'approved');

  const renderBannerForVerification = ({ item }) => {
    const rawLogo = item.brandProfile?.logo || item.restaurant?.logo || currentUser?.logo;
    const logoUri = rawLogo
      ? (rawLogo.startsWith('http') ? rawLogo : `${API_CONFIG.BASE_URL}/uploads/logos/${rawLogo}`)
      : null;
    
    const isSelected = selectedBannerForVerification?._id === item._id || selectedBannerForVerification?.id === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.modernVerificationCard, isSelected && styles.modernVerificationCardSelected]}
        onPress={() => handleSelectBannerForVerification(item)}
        activeOpacity={0.7}
      >
        <View style={styles.modernVerificationContent}>
          <View style={styles.modernVerificationLogoContainer}>
            {rawLogo ? (
              <Image 
                source={{ uri: logoUri }}
                style={styles.modernVerificationLogo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.modernVerificationLogoPlaceholder}>
                <Ionicons name="storefront" size={28} color={theme.colors.primary} />
              </View>
            )}
            {isSelected && (
              <View style={styles.modernSelectedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.modernVerificationInfo}>
            <Text style={styles.modernVerificationTitle} numberOfLines={2}>
              {item.title || 'Başlıksız Kampanya'}
            </Text>
            <Text style={styles.modernVerificationDescription} numberOfLines={2}>
              {item.description || 'Açıklama yok'}
            </Text>
            <View style={styles.modernVerificationStat}>
              <View style={[styles.modernVerificationStatIcon, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="ticket" size={14} color="#F59E0B" />
              </View>
              <Text style={styles.modernVerificationStatText}>
                {item.codeQuota?.used || 0} / {item.codeQuota?.total || 0} Kod
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 0 && styles.tabActive]}
          onPress={() => setActiveTab(0)}
        >
          <View style={[styles.tabIconContainer, activeTab === 0 && styles.tabIconContainerActive]}>
            <Ionicons 
              name="images" 
              size={20} 
              color={activeTab === 0 ? theme.colors.primary : '#9CA3AF'} 
            />
          </View>
          <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>
            Banner Yönetimi
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 1 && styles.tabActive]}
          onPress={() => setActiveTab(1)}
        >
          <View style={[styles.tabIconContainer, activeTab === 1 && styles.tabIconContainerActive]}>
            <Ionicons 
              name="qr-code" 
              size={20} 
              color={activeTab === 1 ? theme.colors.primary : '#9CA3AF'} 
            />
          </View>
          <Text style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}>
            QR Kod Doğrulama
          </Text>
        </TouchableOpacity>
      </View>

      {/* Header with Add Button */}
      {activeTab === 0 && (
        <View style={styles.headerSection}>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="images" size={24} color={theme.colors.primary} />
          <Text style={styles.headerTitle}>Kampanyalarım</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
              onPress={() => {
                // Form verilerini sıfırla ve mevcut kullanıcı bilgilerini yükle
                const defaultCategory = currentUser?.category || (currentUser?.userType === 'eventBrand' ? 'Konser' : 'Kahve');
                setFormData({
                  title: '',
                  campaignDescription: '',
                  targetAudience: 'Genel kitle',
                  category: defaultCategory,
                  codeQuota: 10,
                  codeType: 'random',
                  fixedCode: '',
                  offerType: 'percentage',
                  discountPercentage: 20,
                  originalPrice: '',
                  discountedPrice: '',
                  freeItemName: '',
                  freeItemCondition: '',
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  startTime: '09:00',
                  endTime: '23:00',
                  location: {
                    city: currentUser?.city || 'İstanbul',
                    district: currentUser?.district || 'Kadıköy',
                    address: currentUser?.address || '',
                    coordinates: {
                      latitude: currentUser?.latitude || null,
                      longitude: currentUser?.longitude || null
                    }
                  },
                  brandInfo: {
                    name: currentUser?.name || '',
                    type: currentUser?.brandType || 'restaurant',
                    description: currentUser?.description || ''
                  },
                  menu: {
                    link: '',
                    image: null
                  },
                  bannerImage: null
                });
                setCreateModalVisible(true);
              }}
            >
              <Ionicons name="add" size={20} color={theme.colors.white} />
              <Text style={styles.addButtonText}>Yeni</Text>
        </TouchableOpacity>
      </View>
        </View>
      )}

      {/* Tab Content */}
      {activeTab === 0 ? (
        // Banner Yönetimi Tab
        loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={banners}
          renderItem={renderBannerItem}
          keyExtractor={(item) => item._id || item.id}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.listContainer}
          />
        )
      ) : (
        // QR Kod Doğrulama Tab
        <View style={styles.modernVerificationContainer}>
          <View style={styles.modernVerificationHeader}>
            <View style={styles.modernVerificationHeaderIcon}>
              <Ionicons name="qr-code" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.modernVerificationHeaderContent}>
              <Text style={styles.modernVerificationHeaderTitle}>Banner Seçin</Text>
              <Text style={styles.modernVerificationHeaderSubtitle}>
                Kod doğrulamak için bir kampanya seçin
              </Text>
            </View>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : approvedBanners.length === 0 ? (
            <View style={styles.modernEmptyContainer}>
              <View style={styles.modernEmptyIconContainer}>
                <Ionicons name="qr-code-outline" size={64} color="#D1D5DB" />
              </View>
              <Text style={styles.modernEmptyTitle}>Onaylanmış kampanya yok</Text>
              <Text style={styles.modernEmptySubtext}>
                Kod doğrulamak için önce bir kampanyanın onaylanması gerekiyor
              </Text>
            </View>
          ) : (
            <FlatList
              data={approvedBanners}
              renderItem={renderBannerForVerification}
              keyExtractor={(item) => item._id || item.id}
              contentContainerStyle={styles.modernVerificationListContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary]}
                  tintColor={theme.colors.primary}
                />
              }
            />
          )}

          {/* Kod Doğrula Butonu - Sadece banner seçildiyse görünür */}
          {selectedBannerForVerification && (
            <View style={styles.modernVerifyButtonContainer}>
              <TouchableOpacity
                style={styles.modernVerifyButtonLarge}
                onPress={() => {
                  setVerifyCode('');
                  setCodeInputMode(false);
                  setVerifyModalVisible(true);
                }}
              >
                <View style={styles.modernVerifyButtonIcon}>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                </View>
                <Text style={styles.modernVerifyButtonLargeText}>
                  Kod Doğrula
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Verify Code Modal */}
      <Modal
        visible={verifyModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setVerifyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kod Doğrula</Text>
              <TouchableOpacity
                onPress={() => {
                  setVerifyModalVisible(false);
                  setCodeInputMode(false);
                  setVerifyCode('');
                    // QR doğrulama tab'ındaysa selectedBannerForVerification'ı temizleme
                    if (activeTab === 1) {
                      // Sadece modal'ı kapat, banner seçimini koru
                    } else {
                      setSelectedBanner(null);
                    }
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {(selectedBannerForVerification || selectedBanner)?.title || 'Banner seçilmedi'}
            </Text>
            
            {!codeInputMode ? (
              // Seçenek Ekranı
              <>
                <Text style={styles.modalInfo}>
                  Kod doğrulama yöntemini seçin
                </Text>
                
                <View style={styles.optionButtonsContainer}>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleCodeInputMode}
                  >
                    <Ionicons name="keypad-outline" size={32} color={theme.colors.primary} />
                    <Text style={styles.optionButtonText}>Kodu Gir</Text>
                    <Text style={styles.optionButtonSubtext}>6 haneli kod</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={requestCameraPermission}
                  >
                    <Ionicons name="qr-code-outline" size={32} color={theme.colors.primary} />
                    <Text style={styles.optionButtonText}>QR Okut</Text>
                    <Text style={styles.optionButtonSubtext}>Kamera ile tara</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { marginTop: 20 }]}
                  onPress={() => setVerifyModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Kod Giriş Ekranı
              <>
                <TextInput
                  style={styles.codeInput}
                  placeholder="Müşteri kodunu girin"
                  value={verifyCode}
                  onChangeText={setVerifyCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                
                <Text style={styles.modalInfo}>
                  Müşteri size verdiği 6 haneli kodu girin
                </Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setCodeInputMode(false);
                      setVerifyCode('');
                      setVerifyModalVisible(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Geri</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.verifyButton]}
                    onPress={() => {
                      if (verifyCode.trim()) {
                        setPendingCode(verifyCode);
                        setCodeInputMode(false);
                        setVerifyModalVisible(false);
                        setBillAmountModalVisible(true);
                      } else {
                        Alert.alert('Hata', 'Lütfen kod girin!');
                      }
                    }}
                  >
                    <Text style={styles.verifyButtonText}>Devam</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        visible={scannerVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setScannerVisible(false)}
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              onPress={() => {
                setScannerVisible(false);
                setScanned(false);
              }}
              style={styles.scannerCloseButton}
            >
              <Ionicons name="close" size={28} color={theme.colors.white} />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>QR Kod Okut</Text>
            <TouchableOpacity
              onPress={() => {
                setScannerVisible(false);
                setScanned(false);
              }}
              style={styles.scannerCloseButton}
            >
              <Text style={styles.scannerCloseText}>Kapat</Text>
            </TouchableOpacity>
          </View>
          
          {(permission?.granted || hasPermission) ? (
            <>
              <CameraView
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                style={styles.scanner}
              />
              
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerGuide} />
              </View>
              
              <View style={styles.scannerBottomContainer}>
              <Text style={styles.scannerInfo}>
                QR kodu kameranın karşısına getirin
              </Text>
                {scanned && (
                  <TouchableOpacity
                    style={styles.rescanButton}
                    onPress={() => setScanned(false)}
                  >
                    <Text style={styles.rescanButtonText}>Tekrar Tara</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.scannerCancelButton}
                  onPress={() => {
                    setScannerVisible(false);
                    setScanned(false);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color={theme.colors.white} />
                  <Text style={styles.scannerCancelButtonText}>Kapat</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.scannerPermissionContainer}>
              <Ionicons name="camera-outline" size={64} color={theme.colors.textLight} />
              <Text style={styles.scannerPermissionText}>
                Kamera izni gerekli
              </Text>
              <TouchableOpacity
                style={styles.scannerPermissionButton}
                onPress={requestCameraPermission}
              >
                <Text style={styles.scannerPermissionButtonText}>İzin Ver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scannerCancelButton}
                onPress={() => {
                  setScannerVisible(false);
                  setScanned(false);
                }}
              >
                <Ionicons name="close-circle" size={24} color={theme.colors.white} />
                <Text style={styles.scannerCancelButtonText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Bill Amount Modal */}
      <Modal
        visible={billAmountModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBillAmountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hesap Tutarı</Text>
              <TouchableOpacity
                onPress={() => {
                  setBillAmountModalVisible(false);
                  setBillAmount('');
                  setPendingCode(null);
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalInfo}>
              Müşterinin hesap tutarını girin
            </Text>
            
            <TextInput
              style={styles.codeInput}
              placeholder="Örn: 2000"
              value={billAmount}
              onChangeText={setBillAmount}
              keyboardType="number-pad"
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setBillAmountModalVisible(false);
                  setBillAmount('');
                  setPendingCode(null);
                }}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.verifyButton]}
                onPress={async () => {
                  if (!billAmount || isNaN(billAmount) || parseFloat(billAmount) <= 0) {
                    Alert.alert('Hata', 'Lütfen geçerli bir tutar girin!');
                    return;
                  }
                  
                  setBillAmountModalVisible(false);
                  await handleVerifyCodeWithAmount(pendingCode, parseFloat(billAmount));
                  setBillAmount('');
                  setPendingCode(null);
                }}
              >
                <Text style={styles.verifyButtonText}>Devam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>Başarılı!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.successButtonText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Banner Modal */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bannerFormModal}>
            <View style={styles.bannerFormModalHeader}>
              <View style={styles.bannerFormModalHeaderContent}>
                <Text style={styles.bannerFormModalTitle}>Yeni Kampanya Oluştur</Text>
                <Text style={styles.bannerFormModalSubtitle}>Marka: {currentUser?.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={styles.bannerFormModalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.bannerFormModalScrollContent}
            >

              <TextInput
                style={styles.formInput}
                placeholder="Kampanya Başlığı *"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.title}
                onChangeText={(value) => handleInputChange('title', value)}
              />

              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Kampanya Açıklaması *"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.campaignDescription}
                onChangeText={(value) => handleInputChange('campaignDescription', value)}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.formLabel}>Kod Kotası</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Toplam kod sayısı"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.codeQuota.toString()}
                onChangeText={(value) => handleInputChange('codeQuota', parseInt(value) || 10)}
                keyboardType="number-pad"
              />

              <Text style={styles.formLabel}>Kod Tipi</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[styles.radioOption, formData.codeType === 'random' && styles.radioOptionSelected]}
                  onPress={() => handleInputChange('codeType', 'random')}
                >
                  <Ionicons 
                    name={formData.codeType === 'random' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={formData.codeType === 'random' ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.radioText, formData.codeType === 'random' && styles.radioTextSelected]}>
                    Random Kod
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioOption, formData.codeType === 'fixed' && styles.radioOptionSelected]}
                  onPress={() => handleInputChange('codeType', 'fixed')}
                >
                  <Ionicons 
                    name={formData.codeType === 'fixed' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={formData.codeType === 'fixed' ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.radioText, formData.codeType === 'fixed' && styles.radioTextSelected]}>
                    Sabit Kod
                  </Text>
                </TouchableOpacity>
              </View>

              {formData.codeType === 'fixed' && (
                <TextInput
                  style={styles.formInput}
                  placeholder="Sabit Kod (4-20 karakter)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={formData.fixedCode}
                  onChangeText={(value) => {
                    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
                    handleInputChange('fixedCode', cleaned);
                  }}
                  maxLength={20}
                />
              )}

              <Text style={styles.formLabel}>Kampanya Tipi</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[styles.radioOption, formData.offerType === 'percentage' && styles.radioOptionSelected]}
                  onPress={() => handleInputChange('offerType', 'percentage')}
                >
                  <Ionicons 
                    name={formData.offerType === 'percentage' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={formData.offerType === 'percentage' ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.radioText, formData.offerType === 'percentage' && styles.radioTextSelected]}>
                    Yüzde İndirim
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioOption, formData.offerType === 'fixedPrice' && styles.radioOptionSelected]}
                  onPress={() => handleInputChange('offerType', 'fixedPrice')}
                >
                  <Ionicons 
                    name={formData.offerType === 'fixedPrice' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={formData.offerType === 'fixedPrice' ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.radioText, formData.offerType === 'fixedPrice' && styles.radioTextSelected]}>
                    Sabit Fiyat
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioOption, formData.offerType === 'freeItem' && styles.radioOptionSelected]}
                  onPress={() => handleInputChange('offerType', 'freeItem')}
                >
                  <Ionicons 
                    name={formData.offerType === 'freeItem' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={formData.offerType === 'freeItem' ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.radioText, formData.offerType === 'freeItem' && styles.radioTextSelected]}>
                    Bedava Ürün
                  </Text>
                </TouchableOpacity>
              </View>

              {formData.offerType === 'percentage' && (
                <TextInput
                  style={styles.formInput}
                  placeholder="İndirim Yüzdesi (örn: 20)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={formData.discountPercentage.toString()}
                  onChangeText={(value) => handleInputChange('discountPercentage', parseInt(value) || 0)}
                  keyboardType="number-pad"
                />
              )}

              {formData.offerType === 'fixedPrice' && (
                <>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Normal Fiyat (TL)"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.originalPrice}
                    onChangeText={(value) => handleInputChange('originalPrice', value)}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Kampanyalı Fiyat (TL)"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.discountedPrice}
                    onChangeText={(value) => handleInputChange('discountedPrice', value)}
                    keyboardType="decimal-pad"
                  />
                </>
              )}

              {formData.offerType === 'freeItem' && (
                <>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Koşul (örn: Kahve alana)"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.freeItemCondition}
                    onChangeText={(value) => handleInputChange('freeItemCondition', value)}
                  />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Bedava Ürün (örn: Cheesecake)"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.freeItemName}
                    onChangeText={(value) => handleInputChange('freeItemName', value)}
                  />
                </>
              )}

              <Text style={styles.formLabel}>Başlangıç Tarihi</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.startDate}
                onChangeText={(value) => handleInputChange('startDate', value)}
              />

              <Text style={styles.formLabel}>Bitiş Tarihi</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.endDate}
                onChangeText={(value) => handleInputChange('endDate', value)}
              />

              <Text style={styles.formLabel}>Başlangıç Saati</Text>
              <TextInput
                style={styles.formInput}
                placeholder="HH:MM (örn: 09:00)"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.startTime}
                onChangeText={(value) => handleInputChange('startTime', value)}
              />

              <Text style={styles.formLabel}>Bitiş Saati</Text>
              <TextInput
                style={styles.formInput}
                placeholder="HH:MM (örn: 23:00)"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.endTime}
                onChangeText={(value) => handleInputChange('endTime', value)}
              />

              <View style={styles.bannerFormModalActions}>
                <TouchableOpacity
                  style={[styles.bannerFormModalButton, styles.bannerFormModalCancelButton]}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <Text style={styles.bannerFormModalCancelButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bannerFormModalButton, styles.bannerFormModalSubmitButton]}
                  onPress={handleCreateBanner}
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.white} />
                  ) : (
                    <Text style={styles.bannerFormModalSubmitButtonText}>Oluştur</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Banner Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setEditModalVisible(false);
          setEditingBanner(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bannerFormModal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Kampanya Düzenle</Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditModalVisible(false);
                    setEditingBanner(null);
                  }}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>Marka: {currentUser?.name}</Text>

              <TextInput
                style={styles.formInput}
                placeholder="Kampanya Başlığı *"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.title}
                onChangeText={(value) => handleInputChange('title', value)}
              />

              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Kampanya Açıklaması *"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.campaignDescription}
                onChangeText={(value) => handleInputChange('campaignDescription', value)}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.formLabel}>Kod Kotası</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Toplam kod sayısı"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.codeQuota.toString()}
                onChangeText={(value) => handleInputChange('codeQuota', parseInt(value) || 10)}
                keyboardType="number-pad"
              />

              <Text style={styles.formLabel}>Kod Tipi</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[styles.radioOption, formData.codeType === 'random' && styles.radioOptionSelected]}
                  onPress={() => handleInputChange('codeType', 'random')}
                >
                  <Ionicons 
                    name={formData.codeType === 'random' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={formData.codeType === 'random' ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.radioText, formData.codeType === 'random' && styles.radioTextSelected]}>
                    Random Kod
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioOption, formData.codeType === 'fixed' && styles.radioOptionSelected]}
                  onPress={() => handleInputChange('codeType', 'fixed')}
                >
                  <Ionicons 
                    name={formData.codeType === 'fixed' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={formData.codeType === 'fixed' ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.radioText, formData.codeType === 'fixed' && styles.radioTextSelected]}>
                    Sabit Kod
                  </Text>
                </TouchableOpacity>
              </View>

              {formData.codeType === 'fixed' && (
                <TextInput
                  style={styles.formInput}
                  placeholder="Sabit Kod (4-20 karakter)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={formData.fixedCode}
                  onChangeText={(value) => {
                    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
                    handleInputChange('fixedCode', cleaned);
                  }}
                  maxLength={20}
                />
              )}

              <Text style={styles.formLabel}>Kampanya Tipi</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[styles.radioOption, formData.offerType === 'percentage' && styles.radioOptionSelected]}
                  onPress={() => handleInputChange('offerType', 'percentage')}
                >
                  <Ionicons 
                    name={formData.offerType === 'percentage' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={formData.offerType === 'percentage' ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.radioText, formData.offerType === 'percentage' && styles.radioTextSelected]}>
                    Yüzde İndirim
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioOption, formData.offerType === 'fixedPrice' && styles.radioOptionSelected]}
                  onPress={() => handleInputChange('offerType', 'fixedPrice')}
                >
                  <Ionicons 
                    name={formData.offerType === 'fixedPrice' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={formData.offerType === 'fixedPrice' ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.radioText, formData.offerType === 'fixedPrice' && styles.radioTextSelected]}>
                    Sabit Fiyat
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioOption, formData.offerType === 'freeItem' && styles.radioOptionSelected]}
                  onPress={() => handleInputChange('offerType', 'freeItem')}
                >
                  <Ionicons 
                    name={formData.offerType === 'freeItem' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={formData.offerType === 'freeItem' ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.radioText, formData.offerType === 'freeItem' && styles.radioTextSelected]}>
                    Bedava Ürün
                  </Text>
                </TouchableOpacity>
              </View>

              {formData.offerType === 'percentage' && (
                <TextInput
                  style={styles.formInput}
                  placeholder="İndirim Yüzdesi (örn: 20)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={formData.discountPercentage.toString()}
                  onChangeText={(value) => handleInputChange('discountPercentage', parseInt(value) || 0)}
                  keyboardType="number-pad"
                />
              )}

              {formData.offerType === 'fixedPrice' && (
                <>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Normal Fiyat (TL)"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.originalPrice}
                    onChangeText={(value) => handleInputChange('originalPrice', value)}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Kampanyalı Fiyat (TL)"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.discountedPrice}
                    onChangeText={(value) => handleInputChange('discountedPrice', value)}
                    keyboardType="decimal-pad"
                  />
                </>
              )}

              {formData.offerType === 'freeItem' && (
                <>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Koşul (örn: Kahve alana)"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.freeItemCondition}
                    onChangeText={(value) => handleInputChange('freeItemCondition', value)}
                  />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Bedava Ürün (örn: Cheesecake)"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.freeItemName}
                    onChangeText={(value) => handleInputChange('freeItemName', value)}
                  />
                </>
              )}

              <Text style={styles.formLabel}>Başlangıç Tarihi</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.startDate}
                onChangeText={(value) => handleInputChange('startDate', value)}
              />

              <Text style={styles.formLabel}>Bitiş Tarihi</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.endDate}
                onChangeText={(value) => handleInputChange('endDate', value)}
              />

              <Text style={styles.formLabel}>Başlangıç Saati</Text>
              <TextInput
                style={styles.formInput}
                placeholder="HH:MM (örn: 09:00)"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.startTime}
                onChangeText={(value) => handleInputChange('startTime', value)}
              />

              <Text style={styles.formLabel}>Bitiş Saati</Text>
              <TextInput
                style={styles.formInput}
                placeholder="HH:MM (örn: 23:00)"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.endTime}
                onChangeText={(value) => handleInputChange('endTime', value)}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setEditModalVisible(false);
                    setEditingBanner(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.verifyButton]}
                  onPress={handleUpdateBanner}
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.white} />
                  ) : (
                    <Text style={styles.verifyButtonText}>Kaydet</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  // Header Section
  headerSection: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  // Modern Banner Card
  modernBannerCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerCardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  bannerCardLogoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  bannerCardLogo: {
    width: '100%',
    height: '100%',
  },
  bannerCardLogoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerCardHeaderContent: {
    flex: 1,
  },
  modernBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  modernBannerDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  modernBannerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modernStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modernStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  modernStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernStatContent: {
    flex: 1,
  },
  modernStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  modernStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modernActionButtons: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  modernActionButton: {
    flex: 1,
    minWidth: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modernVerifyButton: {
    backgroundColor: '#10B981',
  },
  modernEditButton: {
    backgroundColor: '#3B82F6',
  },
  modernDeleteButton: {
    backgroundColor: '#EF4444',
  },
  modernActionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  // Legacy styles (keeping for compatibility)
  bannerCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  brandIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  brandLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  brandIconPlaceholder: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandContent: {
    flex: 1,
  },
  brandHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bannerTopSection: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  bannerTopContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.spacing.borderRadius.md,
    gap: 6,
  },
  statusText: {
    ...theme.typography.textStyles.caption,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeights.medium,
  },
  bannerDescription: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
    lineHeight: 20,
  },
  bannerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginBottom: 8,
  },
  bannerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerStatText: {
    ...theme.typography.textStyles.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeights.medium,
  },
  verifyButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.spacing.borderRadius.md,
    gap: 8,
    marginTop: theme.spacing.sm,
  },
  verifyButtonText: {
    ...theme.typography.textStyles.button,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  // Legacy empty container (keeping for compatibility)
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...theme.typography.textStyles.h3,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    ...theme.typography.textStyles.body,
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing.borderRadius.lg,
    width: width - 40,
    padding:10,

    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    ...theme.typography.textStyles.h3,
    fontWeight: theme.typography.fontWeights.bold,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    ...theme.typography.textStyles.body,
    color: '#000000',
    marginBottom: theme.spacing.lg,
    fontWeight: '600',
  },
  codeInput: {
    ...theme.typography.textStyles.h2,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.md,
    padding: 16,
    marginBottom: 12,
    letterSpacing: 4,
  },
  modalInfo: {
    ...theme.typography.textStyles.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.spacing.borderRadius.md,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    ...theme.typography.textStyles.button,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  optionButtonsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  optionButton: {
    flex: 1,
    backgroundColor: theme.colors.primary + '15',
    borderRadius: theme.spacing.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    gap: 8,
  },
  optionButtonText: {
    ...theme.typography.textStyles.button,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeights.bold,
    marginTop: 8,
  },
  optionButtonSubtext: {
    ...theme.typography.textStyles.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  qrScanButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.spacing.borderRadius.md,
    gap: 8,
    marginBottom: 12,
  },
  qrScanButtonText: {
    ...theme.typography.textStyles.button,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    zIndex: 10,
  },
  scannerCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerTitle: {
    ...theme.typography.textStyles.h3,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeights.bold,
  },
  scannerSpacer: {
    width: 40,
  },
  scanner: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerGuide: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: theme.colors.white,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  scannerBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: theme.spacing.md,
    paddingBottom: 40,
    alignItems: 'center',
  },
  scannerInfo: {
    ...theme.typography.textStyles.body,
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  rescanButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.spacing.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  rescanButtonText: {
    ...theme.typography.textStyles.button,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeights.bold,
  },
  scannerCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.spacing.borderRadius.md,
    gap: 8,
    width: '100%',
    maxWidth: 200,
  },
  scannerCancelButtonText: {
    ...theme.typography.textStyles.button,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeights.bold,
  },
  scannerCloseText: {
    ...theme.typography.textStyles.body,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  scannerPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  scannerPermissionText: {
    ...theme.typography.textStyles.h4,
    color: theme.colors.white,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  scannerPermissionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: theme.spacing.lg,
  },
  scannerPermissionButtonText: {
    ...theme.typography.textStyles.button,
    color: theme.colors.white,
  },
  successModalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 24,
    width: width - 60,
    maxWidth: 400,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    ...theme.typography.textStyles.h3,
    fontWeight: theme.typography.fontWeights.bold,
    color: '#4CAF50',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    ...theme.typography.textStyles.body,
    textAlign: 'center',
    marginBottom: 24,
    color: theme.colors.textPrimary,
  },
  successButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  successButtonText: {
    ...theme.typography.textStyles.button,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeights.bold,
  },
  // Tabs Styles
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconContainerActive: {
    backgroundColor: theme.colors.primary + '15',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  // Modern Verification Tab Styles
  modernVerificationContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modernVerificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  modernVerificationHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modernVerificationHeaderContent: {
    flex: 1,
  },
  modernVerificationHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  modernVerificationHeaderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  modernVerificationListContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  modernVerificationCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modernVerificationCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.15,
  },
  modernVerificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernVerificationLogoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    position: 'relative',
  },
  modernVerificationLogo: {
    width: '100%',
    height: '100%',
  },
  modernVerificationLogoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernSelectedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modernVerificationInfo: {
    flex: 1,
  },
  modernVerificationTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  modernVerificationDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  modernVerificationStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernVerificationStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernVerificationStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  modernVerifyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.white,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modernVerifyButtonLarge: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modernVerifyButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernVerifyButtonLargeText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  // Modern Empty State
  modernEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  modernEmptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  modernEmptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modernEmptySubtext: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  // Legacy verification styles (keeping for compatibility)
  verificationContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  verificationTitle: {
    ...theme.typography.textStyles.h3,
    fontWeight: theme.typography.fontWeights.bold,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    color: theme.colors.textPrimary,
  },
  verificationSubtitle: {
    ...theme.typography.textStyles.bodySmall,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  verificationListContainer: {
    padding: theme.spacing.sm,
    paddingBottom: 100,
  },
  verificationBannerCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  verificationBannerCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  verificationBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationBannerLogo: {
    width: 50,
    height: 50,
    borderRadius: theme.spacing.borderRadius.sm,
    marginRight: theme.spacing.md,
  },
  verificationBannerLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  verificationBannerInfo: {
    flex: 1,
  },
  verificationBannerTitle: {
    ...theme.typography.textStyles.body,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  verificationBannerDescription: {
    ...theme.typography.textStyles.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  verificationBannerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  verificationBannerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verificationBannerStatText: {
    ...theme.typography.textStyles.caption,
    color: theme.colors.textSecondary,
  },
  selectedIndicator: {
    marginLeft: theme.spacing.sm,
  },
  verifyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  verifyButtonLarge: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: theme.spacing.borderRadius.md,
    gap: 8,
  },
  verifyButtonLargeText: {
    ...theme.typography.textStyles.button,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeights.bold,
    fontSize: 16,
  },
  // Banner Form Modal Styles
  bannerFormModal: {
    backgroundColor: theme.colors.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 600,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  bannerFormModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bannerFormModalHeaderContent: {
    flex: 1,
    marginRight: 16,
  },
  bannerFormModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  bannerFormModalSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  bannerFormModalCloseButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
  },
  bannerFormModalScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  bannerFormModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  bannerFormModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  bannerFormModalCancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bannerFormModalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  bannerFormModalSubmitButton: {
    backgroundColor: theme.colors.primary,
  },
  bannerFormModalSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  formInput: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: theme.colors.textPrimary,
    fontWeight: '400',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 10,
    marginTop: 4,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    gap: 10,
    flex: 1,
    minWidth: '45%',
  },
  radioOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
  },
  radioText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  radioTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.spacing.borderRadius.md,
    gap: 6,
    flex: 1,
    minWidth: '30%',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    ...theme.typography.textStyles.caption,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeights.semibold,
  },
});

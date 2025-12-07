import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Dimensions,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../theme';
import API_CONFIG from '../config/api';

const { width } = Dimensions.get('window');

const campaignCategories = [
  'Kahve',
  'Yiyecek',
  'Bar/Pub',
  'Giyim',
  'Kuaför',
  'Spor',
  'Tatlı',
  'Mobilya',
  'Market',
  'Çizim',
  'Boyama',
  'Petrol Ofisi'
];

const eventCategories = [
  'Konser',
  'Sinema',
  'Tiyatro',
  'Sosyal Etkinlik',
  'Spor Etkinliği',
  'El Sanatları'
];

export default function BrandProfileScreen({ currentUser, setCurrentUser, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [menuPreview, setMenuPreview] = useState(null);
  const [menuType, setMenuType] = useState('image'); // 'image' veya 'link'
  const [bannerModalVisible, setBannerModalVisible] = useState(false);
  const [bannerImage, setBannerImage] = useState(null);
  const [menuImage, setMenuImage] = useState(null);
  const [bannerFormData, setBannerFormData] = useState({
    title: '',
    description: '',
    discountPercentage: '10',
    codeQuota: '100',
  });
  const [formData, setFormData] = useState({
    brandName: '',
    brandType: '',
    description: '',
    category: 'Kahve',
    phone: '',
    email: '',
    address: '',
    city: 'İstanbul',
    district: 'Kadıköy',
    latitude: null,
    longitude: null,
    logo: null,
    menuImage: null,
    menuLink: null
  });

  const categories = currentUser?.userType === 'eventBrand' ? eventCategories : campaignCategories;

  useEffect(() => {
    if (currentUser) {
      let defaultCategory = currentUser.category;
      if (!defaultCategory) {
        defaultCategory = currentUser.userType === 'eventBrand' ? 'Konser' : 'Kahve';
      }

      setFormData({
        brandName: currentUser.name || '',
        brandType: currentUser.brandType || '',
        description: currentUser.description || '',
        category: defaultCategory,
        phone: currentUser.phone || '',
        email: currentUser.email || '',
        address: currentUser.address || '',
        city: currentUser.city || 'İstanbul',
        district: currentUser.district || 'Kadıköy',
        latitude: currentUser.latitude || null,
        longitude: currentUser.longitude || null,
        logo: null
      });
    }
  }, [currentUser]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoPicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gereklidir.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Hata', 'Logo dosyası 5MB\'dan küçük olmalıdır!');
        return;
      }
      setLogoPreview(asset.uri);
      setFormData(prev => ({
        ...prev,
        logo: asset
      }));
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.brandName.trim()) {
      Alert.alert('Hata', 'Marka adı gerekli!');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const formDataToSend = new FormData();

      formDataToSend.append('brandName', formData.brandName);
      formDataToSend.append('brandType', formData.brandType);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('city', formData.city);
      formDataToSend.append('district', formData.district);

      if (formData.latitude !== null && formData.latitude !== undefined && formData.latitude !== '') {
        formDataToSend.append('latitude', String(formData.latitude));
      }
      if (formData.longitude !== null && formData.longitude !== undefined && formData.longitude !== '') {
        formDataToSend.append('longitude', String(formData.longitude));
      }

      if (formData.logo) {
        const uri = formData.logo.uri;
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
        formDataToSend.append('logo', {
          uri,
          type,
          name: filename,
        }, any);
      }

      if (formData.menuImage) {
        const uri = formData.menuImage.uri;
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formDataToSend.append('menuImage', {
          uri,
          type,
          name: filename,
        }, any);
      }

      // menuLink her zaman gönderilmeli (boş string olsa bile null yapılması için)
      formDataToSend.append('menuLink', formData.menuLink || '');

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formDataToSend
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert('Başarılı', 'Marka profili başarıyla güncellendi!');
        setEditing(false);
        setLogoPreview(null);

        const updatedUser = { ...currentUser, ...result.user };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        if (setCurrentUser) {
          setCurrentUser(updatedUser);
        }
      } else {
        const error = await response.json();
        Alert.alert('Hata', error.message || 'Profil güncellenirken hata oluştu!');
      }
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      Alert.alert('Hata', 'Profil güncellenirken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setLogoPreview(null);
    setMenuPreview(null);
    if (currentUser) {
      let defaultCategory = currentUser.category;
      if (!defaultCategory) {
        defaultCategory = currentUser.userType === 'eventBrand' ? 'Konser' : 'Kahve';
      }

      const initialMenuType = currentUser?.menuLink ? 'link' : (currentUser?.menuImage ? 'image' : 'image');
      setMenuType(initialMenuType);

      setFormData({
        brandName: currentUser.name || '',
        brandType: currentUser.brandType || '',
        description: currentUser.description || '',
        category: defaultCategory,
        phone: currentUser.phone || '',
        email: currentUser.email || '',
        address: currentUser.address || '',
        city: currentUser.city || 'İstanbul',
        district: currentUser.district || 'Kadıköy',
        latitude: currentUser.latitude || null,
        longitude: currentUser.longitude || null,
        logo: null,
        menuImage: null,
        menuLink: null
      });
    }
  };

  const handleBannerImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gereklidir.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Hata', 'Banner görseli 5MB\'dan küçük olmalıdır!');
        return;
      }
      setBannerImage(asset);
    }
  };

  const handleMenuImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gereklidir.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Hata', 'Menü görseli 5MB\'dan küçük olmalıdır!');
        return;
      }
      setMenuPreview(asset.uri);
      setFormData(prev => ({
        ...prev,
        menuImage: asset,
        menuLink: null // Görsel seçildiğinde link'i temizle
      }));
    }
  };

  const handleCreateSimpleBanner = async () => {
    // Form validasyonu
    if (!bannerFormData.title.trim()) {
      Alert.alert('Hata', 'Banner başlığı gerekli!');
      return;
    }
    if (!bannerFormData.description.trim()) {
      Alert.alert('Hata', 'Banner açıklaması gerekli!');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      // Görselleri base64'e çevir
      let bannerImageBase64 = null;
      if (bannerImage) {
        try {
          const response = await fetch(bannerImage.uri);
          const blob = await response.blob();
          const reader = new FileReader();
          bannerImageBase64 = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (imageError) {
          console.error('Görsel yükleme hatası:', imageError);
          Alert.alert('Uyarı', 'Görsel yüklenirken hata oluştu, banner görsel olmadan oluşturulacak.');
        }
      }

      let menuImageBase64 = null;
      if (menuImage) {
        try {
          const response = await fetch(menuImage.uri);
          const blob = await response.blob();
          const reader = new FileReader();
          menuImageBase64 = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (imageError) {
          console.error('Menü görseli yükleme hatası:', imageError);
          Alert.alert('Uyarı', 'Menü görseli yüklenirken hata oluştu, menü görsel olmadan oluşturulacak.');
        }
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/banners/create-simple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({
            title: bannerFormData.title,
            description: bannerFormData.description,
            discountPercentage: parseInt(bannerFormData.discountPercentage) || 10,
            codeQuota: parseInt(bannerFormData.codeQuota) || 100,
            bannerImage: bannerImageBase64,
            menuImage: menuImageBase64
          })
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          'Başarılı',
          'Banner başarıyla oluşturuldu! Admin onayından sonra yayınlanacaktır.',
          [{ 
            text: 'Tamam',
            onPress: () => {
              setBannerModalVisible(false);
              setBannerImage(null);
              setMenuImage(null);
              setBannerFormData({
                title: '',
                description: '',
                discountPercentage: '10',
                codeQuota: '100',
              });
            }
          }]
        );
      } else {
        Alert.alert('Hata', result.message || 'Banner oluşturulurken hata oluştu!');
      }
    } catch (error) {
      console.error('Banner oluşturma hatası:', error);
      Alert.alert('Hata', 'Banner oluşturulurken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  const getLogoUri = () => {
    if (logoPreview) return logoPreview;
    if (currentUser?.logo) {
      if (currentUser.logo.startsWith('http')) return currentUser.logo;
      return `${API_CONFIG.BASE_URL}/uploads/logos/${currentUser.logo}`;
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profilePictureWrapper}>
          <View style={styles.profilePicture}>
            {getLogoUri() ? (
              <Image 
                source={{ uri: getLogoUri() }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
                <View style={styles.profilePlaceholder}>
                  <Ionicons name="storefront" size={48} color={theme.colors.primary} />
                </View>
            )}
          </View>
          {editing && (
            <TouchableOpacity
                style={styles.logoUploadBadge}
              onPress={handleLogoPicker}
            >
                <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
            )}
          </View>
          
          {/* Edit Button */}
          <View style={styles.editButtonContainer}>
            {!editing ? (
              <TouchableOpacity
                style={styles.editButtonFloating}
                onPress={() => setEditing(true)}
              >
                <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.editButtonText}>Düzenle</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.editActionsFloating}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelEdit}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>Kaydet</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <View style={styles.profileInfo}>
          <Text style={styles.userName}>
            {formData.brandName || currentUser?.name || 'Marka Adı'}
          </Text>
            <View style={styles.userMeta}>
              <Ionicons name="call-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.userPhone}>
                {formData.phone || currentUser?.phone || 'Telefon numarası eklenmedi'}
          </Text>
            </View>
            {currentUser?.category && (
              <View style={styles.categoryBadge}>
                <Ionicons name="pricetag" size={12} color={theme.colors.primary} />
                <Text style={styles.categoryText}>{currentUser.category}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Marka Menüsü Card */}
        {editing && (
          <View style={styles.menuCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="restaurant-outline" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Marka Menüsü</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>Opsiyonel</Text>
              </View>
            </View>
            
            <View style={styles.cardContent}>
            
            {/* Menü Tipi Seçimi */}
            <View style={styles.menuTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.menuTypeButton,
                  menuType === 'image' && styles.menuTypeButtonActive
                ]}
                onPress={() => {
                  setMenuType('image');
                  setFormData(prev => ({ ...prev, menuLink: null }));
                }}
              >
                <Ionicons 
                  name="image-outline" 
                  size={20} 
                  color={menuType === 'image' ? '#fff' : theme.colors.textSecondary} 
                />
                <Text style={[
                  styles.menuTypeButtonText,
                  menuType === 'image' && styles.menuTypeButtonTextActive
                ]}>
                  Fotoğraf
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.menuTypeButton,
                  menuType === 'link' && styles.menuTypeButtonActive
                ]}
                onPress={() => {
                  setMenuType('link');
                  setMenuPreview(null);
                  setFormData(prev => ({ ...prev, menuImage: null }));
                }}
              >
                <Ionicons 
                  name="link-outline" 
                  size={20} 
                  color={menuType === 'link' ? '#fff' : theme.colors.textSecondary} 
                />
                <Text style={[
                  styles.menuTypeButtonText,
                  menuType === 'link' && styles.menuTypeButtonTextActive
                ]}>
                  QR Link
                </Text>
              </TouchableOpacity>
            </View>

            {/* Menü Görseli Yükleme */}
            {menuType === 'image' && (
              <>
                {menuPreview || currentUser?.menuImage ? (
                  <View style={styles.menuPreviewContainer}>
                    <Image
                      source={{ 
                        uri: menuPreview || (currentUser?.menuImage?.startsWith('http') 
                          ? currentUser.menuImage 
                          : `${API_CONFIG.BASE_URL}/uploads/menus/${currentUser.menuImage}`)
                      }}
                      style={styles.menuPreview}
                      resizeMode="contain"
                    />
                    <TouchableOpacity
                      style={styles.removeMenuButton}
                      onPress={() => {
                        setMenuPreview(null);
                        setFormData(prev => ({ ...prev, menuImage: null }));
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color="#E53935" />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.menuUploadButton}
                  onPress={handleMenuImagePicker}
                >
                  <Ionicons name="camera" size={20} color={theme.colors.primary} />
                  <Text style={styles.menuUploadText}>
                    {menuPreview || currentUser?.menuImage ? 'Menü Görselini Değiştir' : 'Menü Fotoğrafı Yükle'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.menuHelperText}>
                  Maksimum 5MB, JPG/PNG. Bu menü tüm banner'larınızda otomatik olarak gösterilecektir.
                </Text>
              </>
            )}

            {/* Menü Linki */}
            {menuType === 'link' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="QR Menü Linki (https://example.com/menu)"
                  value={formData.menuLink || currentUser?.menuLink || ''}
                  onChangeText={(value) => handleInputChange('menuLink', value)}
                  keyboardType="url"
                  autoCapitalize="none"
                />
                {(formData.menuLink || currentUser?.menuLink) && (
                  <TouchableOpacity
                    style={styles.removeMenuLinkButton}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, menuLink: null }));
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#E53935" />
                    <Text style={styles.removeMenuLinkText}>Menü Linkini Kaldır</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            </View>
          </View>
        )}

        {/* Menü Görüntüleme Card (Düzenleme modu dışında) */}
        {!editing && (currentUser?.menuImage || currentUser?.menuLink || (currentUser?.menuImages && currentUser.menuImages.length > 0)) && (
          <View style={styles.menuCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="restaurant-outline" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Marka Menüsü</Text>
            </View>
            <View style={styles.cardContent}>
              {currentUser?.menuImages && currentUser.menuImages.length > 0 ? (
                <View style={styles.menuImagesGrid}>
                  {currentUser.menuImages.map((menuImg, index) => (
                    <Image
                      key={index}
                      source={{ 
                        uri: menuImg.startsWith('http') 
                          ? menuImg 
                          : `${API_CONFIG.BASE_URL}/uploads/menus/${menuImg}`
                      }}
                      style={styles.menuDisplayItem}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              ) : currentUser?.menuImage ? (
                <Image
                  source={{ 
                    uri: currentUser.menuImage.startsWith('http') 
                      ? currentUser.menuImage 
                      : `${API_CONFIG.BASE_URL}/uploads/menus/${currentUser.menuImage}`
                  }}
                  style={styles.menuDisplay}
                  resizeMode="contain"
                />
              ) : currentUser?.menuLink ? (
                <View style={styles.menuLinkDisplay}>
                  <View style={styles.menuLinkIconContainer}>
                    <Ionicons name="link" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.menuLinkContent}>
                    <Text style={styles.menuLinkLabel}>QR Menü Linki</Text>
                    <Text style={styles.menuLinkText} numberOfLines={2}>{currentUser.menuLink}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Kredi Bilgisi Card */}
        <View style={styles.creditCard}>
          <View style={styles.creditCardHeader}>
            <View style={[styles.creditIconContainer, { backgroundColor: (currentUser?.credits || 0) > 0 ? '#4CAF5020' : '#E5393520' }]}>
              <Ionicons 
                name="wallet" 
                size={24} 
                color={(currentUser?.credits || 0) > 0 ? '#4CAF50' : '#E53935'} 
              />
            </View>
            <View style={styles.creditCardContent}>
          <Text style={styles.creditLabel}>Kalan Krediniz</Text>
          <Text style={[styles.creditValue, { color: (currentUser?.credits || 0) > 0 ? '#4CAF50' : '#E53935' }]}>
            {currentUser?.credits || 0}
          </Text>
            </View>
          </View>
          <View style={[styles.creditInfoContainer, { backgroundColor: (currentUser?.credits || 0) > 0 ? '#4CAF5010' : '#E5393510' }]}>
            <Ionicons 
              name={(currentUser?.credits || 0) > 0 ? 'checkmark-circle' : 'alert-circle'} 
              size={16} 
              color={(currentUser?.credits || 0) > 0 ? '#4CAF50' : '#E53935'} 
            />
            <Text style={[styles.creditInfo, { color: (currentUser?.credits || 0) > 0 ? '#4CAF50' : '#E53935' }]}>
            {(currentUser?.credits || 0) > 0 
                ? 'Kampanya oluşturmak için krediniz yeterli' 
                : 'Kampanya oluşturmak için kredi satın alın'}
          </Text>
          </View>
        </View>

        {/* Sabit Banner Oluştur Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerCardHeader}>
            <View style={styles.bannerIconContainer}>
              <Ionicons name="megaphone" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.bannerCardHeaderContent}>
              <Text style={styles.bannerCardTitle}>Sabit Banner Oluştur</Text>
              <Text style={styles.bannerCardDescription}>
                Markanız için sabit bir kampanya banner'ı oluşturun
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.createBannerButton}
            onPress={() => setBannerModalVisible(true)}
            disabled={loading}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.createBannerButtonText}>Banner Oluştur</Text>
          </TouchableOpacity>
          </View>
          
        {/* Banner Oluşturma Modal */}
        <Modal
          visible={bannerModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setBannerModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Yeni Banner Oluştur</Text>
                <TouchableOpacity
                  onPress={() => {
                    setBannerModalVisible(false);
                    setBannerImage(null);
                    setBannerFormData({
                      title: '',
                      description: '',
                      discountPercentage: '10',
                      codeQuota: '100',
                    });
                  }}
                >
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                {/* Banner Görseli */}
                <View style={styles.bannerImageContainer}>
                  <Text style={styles.inputLabel}>Banner Görseli (Opsiyonel)</Text>
                  <TouchableOpacity
                    style={styles.bannerImagePicker}
                    onPress={handleBannerImagePicker}
                  >
                    {bannerImage ? (
                      <Image
                        source={{ uri: bannerImage.uri }}
                        style={styles.bannerImagePreview}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.bannerImagePlaceholder}>
                        <Ionicons name="image-outline" size={48} color={theme.colors.textSecondary} />
                        <Text style={styles.bannerImagePlaceholderText}>Görsel Seç</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {bannerImage && (
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setBannerImage(null)}
                    >
                      <Ionicons name="close-circle" size={24} color="#E53935" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Menü Görseli */}
                <View style={styles.bannerImageContainer}>
                  <Text style={styles.inputLabel}>Marka Menüsü (Opsiyonel)</Text>
                  <TouchableOpacity
                    style={styles.bannerImagePicker}
                    onPress={handleMenuImagePicker}
                  >
                    {menuImage ? (
                      <Image
                        source={{ uri: menuImage.uri }}
                        style={styles.bannerImagePreview}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.bannerImagePlaceholder}>
                        <Ionicons name="restaurant-outline" size={48} color={theme.colors.textSecondary} />
                        <Text style={styles.bannerImagePlaceholderText}>Menü Görseli Seç</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {menuImage && (
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setMenuImage(null)}
                    >
                      <Ionicons name="close-circle" size={24} color="#E53935" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Banner Başlığı */}
          <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Banner Başlığı *</Text>
                  <TextInput
                    style={styles.input}
                    value={bannerFormData.title}
                    onChangeText={(value) => setBannerFormData(prev => ({ ...prev, title: value }))}
                    placeholder="Örn: Özel İndirim Kampanyası"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                {/* Banner Açıklaması */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Banner Açıklaması *</Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    value={bannerFormData.description}
                    onChangeText={(value) => setBannerFormData(prev => ({ ...prev, description: value }))}
                    placeholder="Kampanya detaylarını buraya yazın..."
                    placeholderTextColor={theme.colors.textSecondary}
                    textAlignVertical="top"
                  />
                </View>

                {/* İndirim Yüzdesi */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>İndirim Yüzdesi (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={bannerFormData.discountPercentage}
                    onChangeText={(value) => setBannerFormData(prev => ({ ...prev, discountPercentage: value }))}
                    placeholder="10"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                {/* Kod Kotası */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Kod Kotası</Text>
                  <TextInput
                    style={styles.input}
                    value={bannerFormData.codeQuota}
                    onChangeText={(value) => setBannerFormData(prev => ({ ...prev, codeQuota: value }))}
                    placeholder="100"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setBannerModalVisible(false);
                    setBannerImage(null);
                    setBannerFormData({
                      title: '',
                      description: '',
                      discountPercentage: '10',
                      codeQuota: '100',
                    });
                  }}
                  disabled={loading}
                >
                  <Text style={styles.modalCancelButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalCreateButton, loading && styles.modalCreateButtonDisabled]}
                  onPress={handleCreateSimpleBanner}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.modalCreateButtonText}>Oluştur</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Marka Bilgileri Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Marka Bilgileri</Text>
          </View>
          
          <View style={styles.cardContent}>
            {/* Açıklama */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="document-text-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.inputLabel}>Marka Açıklaması</Text>
              </View>
            <TextInput
                style={[styles.modernInput, styles.textArea, !editing && styles.inputDisabled]}
              multiline
              numberOfLines={4}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              editable={editing}
              placeholder="Marka açıklaması girin..."
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

            {/* İletişim Bilgileri */}
            <View style={styles.contactSection}>
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="call-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.inputLabel}>Telefon</Text>
                </View>
            <TextInput
                  style={[styles.modernInput, !editing && styles.inputDisabled]}
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              editable={editing}
              placeholder="Telefon numarası"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="mail-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.inputLabel}>E-posta</Text>
                </View>
            <TextInput
                  style={[styles.modernInput, !editing && styles.inputDisabled]}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              editable={editing}
              placeholder="E-posta adresi"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
              </View>
          </View>

            {/* Adres Bilgileri */}
            <View style={styles.addressSection}>
              <View style={styles.sectionSubtitle}>
                <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.sectionSubtitleText}>Konum Bilgileri</Text>
              </View>
              
              <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Adres</Text>
            <TextInput
                  style={[styles.modernInput, !editing && styles.inputDisabled]}
              value={formData.address}
              onChangeText={(value) => handleInputChange('address', value)}
              editable={editing}
              placeholder="Adres"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

              <View style={styles.locationRow}>
                <View style={[styles.inputGroup, styles.inputGroupHalf]}>
            <Text style={styles.inputLabel}>İlçe</Text>
            <TextInput
                    style={[styles.modernInput, !editing && styles.inputDisabled]}
              value={formData.district}
              onChangeText={(value) => handleInputChange('district', value)}
              editable={editing}
              placeholder="İlçe"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

                <View style={[styles.inputGroup, styles.inputGroupHalf]}>
            <Text style={styles.inputLabel}>Şehir</Text>
            <TextInput
                    style={[styles.modernInput, !editing && styles.inputDisabled]}
              value={formData.city}
              onChangeText={(value) => handleInputChange('city', value)}
              editable={editing}
              placeholder="Şehir"
              placeholderTextColor={theme.colors.textSecondary}
            />
                </View>
          </View>

          {/* Kategori - Sadece görüntüleme */}
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Ionicons name="pricetag" size={18} color={theme.colors.primary} />
            </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemLabel}>Kategori</Text>
              <Text style={[
                    styles.infoItemValue,
                    !currentUser?.category && styles.infoItemValueEmpty
              ]}>
                {currentUser?.category || 'Henüz seçilmedi'}
              </Text>
            </View>
          </View>

          {/* Konum Koordinatları */}
              {editing && (
                <View style={styles.coordinatesSection}>
                  <View style={styles.sectionSubtitle}>
                    <Ionicons name="map-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.sectionSubtitleText}>Koordinatlar (Opsiyonel)</Text>
                  </View>
                  <View style={styles.locationRow}>
                    <View style={[styles.inputGroup, styles.inputGroupHalf]}>
                      <Text style={styles.inputLabel}>Enlem</Text>
            <TextInput
                        style={[styles.modernInput, !editing && styles.inputDisabled]}
              value={formData.latitude ? String(formData.latitude) : ''}
              onChangeText={(value) => handleInputChange('latitude', value ? parseFloat(value) : null)}
              editable={editing}
                        placeholder="41.0082"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
                    <View style={[styles.inputGroup, styles.inputGroupHalf]}>
                      <Text style={styles.inputLabel}>Boylam</Text>
            <TextInput
                        style={[styles.modernInput, !editing && styles.inputDisabled]}
              value={formData.longitude ? String(formData.longitude) : ''}
              onChangeText={(value) => handleInputChange('longitude', value ? parseFloat(value) : null)}
              editable={editing}
                        placeholder="28.9784"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Logout Button Card */}
        <View style={styles.logoutCard}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={() => {
              Alert.alert(
                'Çıkış Yap',
                'Çıkış yapmak istediğinizden emin misiniz?',
                [
                  { text: 'İptal', style: 'cancel' },
                  { 
                    text: 'Çıkış Yap', 
                    style: 'destructive',
                    onPress: () => {
                      if (onLogout) {
                        onLogout();
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  editButtonContainer: {
    position: 'absolute',
    top: 10,
    marginBottom:20,
    right: 20,
  },
  editButtonFloating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 1.5,
    borderColor: theme.colors.primary + '30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  editActionsFloating: {
    flexDirection: 'row',
    gap: 10,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 20,
  },
  // Profile Header Card
  profileHeaderCard: {
    backgroundColor: theme.colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  profilePictureWrapper: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 40,
    position: 'relative',
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  logoUploadBadge: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    width: 36,
    height: 36,
    borderRadius: 18,
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
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  userPhone: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  // Credit Card
  creditCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  creditCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creditIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  creditCardContent: {
    flex: 1,
  },
  creditLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  creditValue: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  creditInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  creditInfo: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  // Info Card
  infoCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    letterSpacing: -0.3,
  },
  optionalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  optionalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  cardContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputGroupHalf: {
    flex: 1,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  modernInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  contactSection: {
    marginTop: 8,
  },
  addressSection: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sectionSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionSubtitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordinatesSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoItemContent: {
    flex: 1,
  },
  infoItemLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoItemValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  infoItemValueEmpty: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  // Logout Card
  logoutCard: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Banner Card
  bannerCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  bannerCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  bannerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bannerCardHeaderContent: {
    flex: 1,
  },
  bannerCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  bannerCardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  createBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createBannerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalScrollView: {
    maxHeight: 500,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  bannerImageContainer: {
    marginBottom: 20,
  },
  bannerImagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    marginTop: 8,
    position: 'relative',
  },
  bannerImagePreview: {
    width: '100%',
    height: '100%',
  },
  bannerImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalCreateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  modalCreateButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  modalCreateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Menu Card
  menuCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  menuTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  menuTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  menuTypeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  menuTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  menuTypeButtonTextActive: {
    color: '#fff',
  },
  menuPreviewContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  menuPreview: {
    width: '100%',
    height: 200,
  },
  menuDisplay: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  removeMenuButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  menuUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  menuUploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  menuHelperText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  menuImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuDisplayItem: {
    width: (width - 72) / 2,
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuLinkDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  menuLinkIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLinkContent: {
    flex: 1,
  },
  menuLinkLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  menuLinkText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  removeMenuLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  removeMenuLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E53935',
  },
});

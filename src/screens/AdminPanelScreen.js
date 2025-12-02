import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchPendingBanners,
  approveBanner,
  rejectBanner,
} from '../services/apiService';
import API_CONFIG from '../config/api';
import theme from '../theme';

const { width } = Dimensions.get('window');

export default function AdminPanelScreen({ currentUser }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingBanners, setPendingBanners] = useState([]);
  const [approvedBanners, setApprovedBanners] = useState([]);
  const [rejectedBanners, setRejectedBanners] = useState([]);
  const [allBanners, setAllBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadAllData();
    }, [])
  );

  const loadAllData = async () => {
    await Promise.all([
      loadPendingBanners(),
      loadApprovedBanners(),
      loadRejectedBanners(),
      loadAllBanners(),
    ]);
  };

  const getToken = async () => {
    return await AsyncStorage.getItem('authToken');
  };

  const loadPendingBanners = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/banners/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      // Event'leri de al
      const eventsResponse = await fetch(`${API_CONFIG.BASE_URL}/api/admin/events/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const eventsData = await eventsResponse.json();

      // Banner'lar ve event'leri birleştir
      let allPending = [];
      if (data.success) {
        allPending = [...data.data];
      }
      if (eventsData.success && eventsData.data.length > 0) {
        const formattedEvents = eventsData.data.map(event => ({
          _id: event._id,
          title: event.title || event.eventTitle,
          description: event.description || event.eventDescription,
          category: event.category,
          contentType: 'event',
          approvalStatus: 'pending',
          createdAt: event.createdAt,
          startDate: event.startDate,
          endDate: event.endDate,
          restaurant: { name: event.organizerName || 'Kullanıcı' },
          bannerImage: event.bannerImage,
          isEvent: true
        }));
        allPending = [...allPending, ...formattedEvents];
      }

      setPendingBanners(allPending);
    } catch (error) {
      console.error('Pending yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovedBanners = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/banners/approved`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setApprovedBanners(data.data);
      }
    } catch (error) {
      console.error('Approved yükleme hatası:', error);
    }
  };

  const loadRejectedBanners = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/banners/rejected`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setRejectedBanners(data.data);
      }
    } catch (error) {
      console.error('Rejected yükleme hatası:', error);
    }
  };

  const loadAllBanners = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/banners/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAllBanners(data.data);
      }
    } catch (error) {
      console.error('All banners yükleme hatası:', error);
    }
  };

  const handleApproveBanner = async (banner) => {
    Alert.alert(
      'Onayla',
      'Bu içeriği onaylamak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            try {
              const isEvent = banner.isEvent || banner.contentType === 'event';
              const token = await getToken();
              const endpoint = isEvent
                ? `${API_CONFIG.BASE_URL}/api/admin/events/${banner._id}/approve`
                : `${API_CONFIG.BASE_URL}/api/admin/banners/${banner._id}/approve`;

              const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });
              const data = await response.json();

              if (data.success) {
                Alert.alert('Başarılı', isEvent ? 'Etkinlik başarıyla onaylandı!' : 'Kampanya başarıyla onaylandı!');
                loadAllData();
              } else {
                Alert.alert('Hata', data.message || 'Onaylanırken hata oluştu!');
              }
            } catch (error) {
              console.error('Onaylama hatası:', error);
              Alert.alert('Hata', 'Onaylanırken hata oluştu!');
            }
          }
        }
      ]
    );
  };

  const handleRejectBanner = async () => {
    if (!selectedBanner || !rejectReason.trim()) {
      Alert.alert('Hata', 'Lütfen red sebebi girin!');
      return;
    }

    try {
      const isEvent = selectedBanner.isEvent || selectedBanner.contentType === 'event';
      const token = await getToken();
      const endpoint = isEvent
        ? `${API_CONFIG.BASE_URL}/api/admin/events/${selectedBanner._id}/reject`
        : `${API_CONFIG.BASE_URL}/api/admin/banners/${selectedBanner._id}/reject`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      const data = await response.json();

      if (data.success) {
        Alert.alert('Başarılı', isEvent ? 'Etkinlik reddedildi!' : 'Kampanya reddedildi!');
        setRejectModalVisible(false);
        setRejectReason('');
        setSelectedBanner(null);
        loadAllData();
      } else {
        Alert.alert('Hata', data.message || 'Reddedilirken hata oluştu!');
      }
    } catch (error) {
      console.error('Reddetme hatası:', error);
      Alert.alert('Hata', 'Reddedilirken hata oluştu!');
    }
  };

  const openRejectModal = (banner) => {
    setSelectedBanner(banner);
    setRejectModalVisible(true);
  };

  const openDetailModal = (banner) => {
    setSelectedBanner(banner);
    setDetailModalVisible(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '-';
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getBannerImageUrl = (banner) => {
    if (!banner.bannerImage) return null;
    if (banner.bannerImage.startsWith('http')) return banner.bannerImage;
    return `${API_CONFIG.BASE_URL}/${banner.bannerImage}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Onay Bekliyor', color: '#f59e0b' },
      approved: { text: 'Onaylandı', color: '#10b981' },
      rejected: { text: 'Reddedildi', color: '#ef4444' }
    };
    return badges[status] || badges.pending;
  };

  const filterBanners = (banners) => {
    if (!searchQuery.trim()) return banners;

    const query = searchQuery.toLowerCase();
    return banners.filter(banner =>
      banner.title?.toLowerCase().includes(query) ||
      banner.restaurant?.name?.toLowerCase().includes(query) ||
      banner.category?.toLowerCase().includes(query)
    );
  };

  const getCurrentBanners = () => {
    switch (activeTab) {
      case 'pending':
        return filterBanners(pendingBanners);
      case 'approved':
        return filterBanners(approvedBanners);
      case 'rejected':
        return filterBanners(rejectedBanners);
      case 'all':
        return filterBanners(allBanners);
      default:
        return [];
    }
  };

  const currentBanners = getCurrentBanners();
  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="shield-checkmark" size={28} color={theme.colors.primary} />
          <Text style={styles.headerTitle}>Admin Panel</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="İşletme adı veya kampanya türüne göre ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              Bekleyen ({pendingBanners.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'approved' && styles.tabActive]}
            onPress={() => setActiveTab('approved')}
          >
            <Text style={[styles.tabText, activeTab === 'approved' && styles.tabTextActive]}>
              Onaylanan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rejected' && styles.tabActive]}
            onPress={() => setActiveTab('rejected')}
          >
            <Text style={[styles.tabText, activeTab === 'rejected' && styles.tabTextActive]}>
              Reddedilen
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              Tümü
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : currentBanners.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="inbox-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>İçerik bulunamadı</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          {currentBanners.map((banner) => {
            const status = getStatusBadge(banner.approvalStatus);
            const imageUrl = getBannerImageUrl(banner);
            return (
              <View key={banner._id} style={styles.card}>
                {imageUrl && (
                  <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
                )}
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{banner.title}</Text>
                    <View style={[styles.badge, { backgroundColor: status.color + '20' }]}>
                      <Text style={[styles.badgeText, { color: status.color }]}>
                        {status.text}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>
                    {banner.restaurant?.name || 'Kullanıcı'} - {banner.contentType === 'event' ? 'Etkinlik' : 'Kampanya'}
                  </Text>
                  <Text style={styles.cardDate}>
                    {banner.isEvent
                      ? formatDateRange(banner.startDate, banner.endDate)
                      : formatDate(banner.createdAt)
                    }
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  {activeTab === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApproveBanner(banner)}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                        <Text style={styles.actionButtonText}>Onayla</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => openRejectModal(banner)}
                      >
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                        <Text style={styles.actionButtonText}>Reddet</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.detailButton]}
                    onPress={() => openDetailModal(banner)}
                  >
                    <Text style={styles.detailButtonText}>Detaylar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedBanner?.contentType === 'event' ? 'Etkinlik' : 'Kampanya'} Detayları
              </Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedBanner?.bannerImage && (
                <Image
                  source={{ uri: getBannerImageUrl(selectedBanner) }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
              )}
              <Text style={styles.modalDetailTitle}>{selectedBanner?.title}</Text>
              <Text style={styles.modalDescription}>{selectedBanner?.description}</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>İşletme/Organizatör</Text>
                  <Text style={styles.detailValue}>{selectedBanner?.restaurant?.name || 'Kullanıcı'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Kategori</Text>
                  <Text style={styles.detailValue}>{selectedBanner?.category}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Tür</Text>
                  <Text style={styles.detailValue}>
                    {selectedBanner?.contentType === 'event' ? 'Etkinlik' : 'Kampanya'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Durum</Text>
                  <View style={[styles.badge, { backgroundColor: getStatusBadge(selectedBanner?.approvalStatus).color + '20' }]}>
                    <Text style={[styles.badgeText, { color: getStatusBadge(selectedBanner?.approvalStatus).color }]}>
                      {getStatusBadge(selectedBanner?.approvalStatus).text}
                    </Text>
                  </View>
                </View>
                {selectedBanner?.isEvent && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Tarih Aralığı</Text>
                    <Text style={styles.detailValue}>
                      {formatDateRange(selectedBanner.startDate, selectedBanner.endDate)}
                    </Text>
                  </View>
                )}
                {!selectedBanner?.isEvent && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Oluşturulma</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedBanner?.createdAt)}</Text>
                  </View>
                )}
                {selectedBanner?.rejectedReason && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Red Sebebi</Text>
                    <Text style={[styles.detailValue, styles.rejectReasonText]}>
                      {selectedBanner.rejectedReason}
          </Text>
                  </View>
                )}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setDetailModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.rejectModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>İçeriği Reddet</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Red Sebebi</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                placeholder="Lütfen red sebebini açıklayın..."
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonReject]}
                onPress={handleRejectBanner}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={[styles.modalButtonText, { color: '#fff', marginLeft: 8 }]}>Reddet</Text>
              </TouchableOpacity>
            </View>
        </View>
      </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    ...theme.typography.textStyles.h3,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  tabsContainer: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: theme.colors.white,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 200,
    backgroundColor: theme.colors.border,
  },
  cardContent: {
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    paddingTop: 0,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#10b98120',
  },
  rejectButton: {
    backgroundColor: '#ef444420',
  },
  detailButton: {
    backgroundColor: theme.colors.primary + '20',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
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
  },
  rejectModalContent: {
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalBody: {
    padding: theme.spacing.lg,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: theme.spacing.md,
  },
  modalDetailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  modalDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  detailGrid: {
    gap: theme.spacing.md,
  },
  detailItem: {
    marginBottom: theme.spacing.md,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  rejectReasonText: {
    color: '#ef4444',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: theme.colors.border,
  },
  modalButtonReject: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

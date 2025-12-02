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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config/api';
import theme from '../theme';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [days, setDays] = useState(30);
  const [overviewData, setOverviewData] = useState(null);
  const [bannerStats, setBannerStats] = useState(null);
  const [qrStats, setQrStats] = useState(null);

  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser, days]);

  useFocusEffect(
    React.useCallback(() => {
      loadAllData();
    }, [days])
  );

  const getToken = async () => {
    return await AsyncStorage.getItem('authToken');
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [overviewRes, bannerRes, qrRes] = await Promise.all([
        fetch(`${API_CONFIG.BASE_URL}/api/analytics/overview?days=${days}`, { headers }),
        fetch(`${API_CONFIG.BASE_URL}/api/analytics/banner-stats?days=${days}`, { headers }),
        fetch(`${API_CONFIG.BASE_URL}/api/analytics/qr-stats?days=${days}`, { headers }),
      ]);

      const [overviewData, bannerData, qrData] = await Promise.all([
        overviewRes.json(),
        bannerRes.json(),
        qrRes.json(),
      ]);

      if (overviewData.success) setOverviewData(overviewData.data);
      if (bannerData.success) setBannerStats(bannerData.data);
      if (qrData.success) setQrStats(qrData.data);
    } catch (error) {
      console.error('Analytics yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const renderStatCard = (icon, label, value, subtitle, color = theme.colors.primary) => (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const renderBannerTable = () => {
    if (!bannerStats || !bannerStats.byBanner || bannerStats.byBanner.length === 0) {
      return (
        <View style={styles.emptyTable}>
          <Ionicons name="document-text-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTableText}>Henüz banner tıklaması kaydı bulunmuyor</Text>
        </View>
      );
    }

    return (
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Banner Adı</Text>
          <Text style={styles.tableHeaderCell}>Görüntülenme</Text>
          <Text style={styles.tableHeaderCell}>Tıklama</Text>
        </View>
        {bannerStats.byBanner.map((banner, index) => (
          <View key={banner.bannerId || index} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2, fontWeight: '500' }]} numberOfLines={1}>
              {banner.bannerTitle}
            </Text>
            <Text style={styles.tableCell}>{banner.views || 0}</Text>
            <Text style={styles.tableCell}>{banner.clicks || 0}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderQRTable = () => {
    if (!qrStats || !qrStats.byBanner || qrStats.byBanner.length === 0) {
      return (
        <View style={styles.emptyTable}>
          <Ionicons name="qr-code-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTableText}>Henüz QR kod oluşturulmamış</Text>
        </View>
      );
    }

    return (
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Banner Adı</Text>
          <Text style={styles.tableHeaderCell}>Oluşturulan</Text>
          <Text style={styles.tableHeaderCell}>Kullanılan</Text>
          <Text style={styles.tableHeaderCell}>Oran</Text>
        </View>
        {qrStats.byBanner.map((banner, index) => (
          <View key={banner.bannerId || index} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2, fontWeight: '500' }]} numberOfLines={1}>
              {banner.bannerTitle}
            </Text>
            <Text style={styles.tableCell}>{banner.generated}</Text>
            <Text style={[styles.tableCell, { color: '#10b981' }]}>
              {banner.used}
            </Text>
            <Text style={styles.tableCell}>%{banner.conversionRate}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodScrollContent}>
          {[7, 30, 90].map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.periodChip, days === d && styles.periodChipActive]}
              onPress={() => setDays(d)}
            >
              <Text style={[styles.periodChipText, days === d && styles.periodChipTextActive]}>
                Son {d} Gün
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          {/* Overview Stats */}
          {overviewData && (
            <View style={styles.overviewSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="stats-chart" size={24} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Genel Bakış</Text>
              </View>
              <View style={styles.statsGrid}>
                {renderStatCard(
                  'eye-outline',
                  'Toplam Görüntülenme',
                  overviewData.clicks.views.toLocaleString(),
                  `${days} gün içinde`,
                  '#3b82f6'
                )}
                {renderStatCard(
                  'hand-left-outline',
                  'Toplam Tıklama',
                  overviewData.clicks.clicks.toLocaleString(),
                  `%${overviewData.clicks.clickThroughRate} tıklama oranı`,
                  theme.colors.primary
                )}
                {renderStatCard(
                  'qr-code-outline',
                  'QR Kod Oluşturuldu',
                  overviewData.qrCodes.generated.toLocaleString(),
                  `${overviewData.qrCodes.used} kullanıldı`,
                  '#10b981'
                )}
                {renderStatCard(
                  'trending-up-outline',
                  'QR Kod Dönüşüm Oranı',
                  `%${overviewData.qrCodes.conversionRate}`,
                  `${overviewData.qrCodes.used}/${overviewData.qrCodes.generated} kullanıldı`,
                  '#f59e0b'
                )}
              </View>
            </View>
          )}

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 0 && styles.tabActive]}
              onPress={() => setActiveTab(0)}
            >
              <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>
                Banner Tıklamaları
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 1 && styles.tabActive]}
              onPress={() => setActiveTab(1)}
            >
              <Text style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}>
                QR Kod İstatistikleri
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 2 && styles.tabActive]}
              onPress={() => setActiveTab(2)}
            >
              <Text style={[styles.tabText, activeTab === 2 && styles.tabTextActive]}>
                Genel Bakış
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 0 && bannerStats && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeader}>
                <Ionicons name="images-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Banner Tıklamaları Detayları</Text>
              </View>
              
              {/* Summary */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIconContainer, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="eye-outline" size={24} color="#3b82f6" />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Toplam Görüntülenme</Text>
                    <Text style={[styles.summaryValue, { color: '#3b82f6' }]}>
                      {bannerStats.totals.views.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIconContainer, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="hand-left-outline" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Toplam Tıklama</Text>
                    <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
                      {bannerStats.totals.clicks.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIconContainer, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="trending-up-outline" size={24} color="#10b981" />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Tıklama Oranı</Text>
                    <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                      %{bannerStats.totals.clickThroughRate}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Banner List */}
              <View style={styles.sectionHeader}>
                <Ionicons name="list-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Banner Bazında İstatistikler</Text>
              </View>
              {renderBannerTable()}
            </View>
          )}

          {activeTab === 1 && qrStats && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeader}>
                <Ionicons name="qr-code-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>QR Kod İstatistikleri Detayları</Text>
              </View>
              
              {/* Summary */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIconContainer, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="add-circle-outline" size={24} color="#10b981" />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Oluşturulan</Text>
                    <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                      {qrStats.totals.generated.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIconContainer, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#3b82f6" />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Kullanılan</Text>
                    <Text style={[styles.summaryValue, { color: '#3b82f6' }]}>
                      {qrStats.totals.used.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIconContainer, { backgroundColor: '#FFFBEB' }]}>
                    <Ionicons name="close-circle-outline" size={24} color="#f59e0b" />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Kullanılmayan</Text>
                    <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                      {qrStats.totals.unused.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIconContainer, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="trending-up-outline" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Dönüşüm Oranı</Text>
                    <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
                      %{qrStats.totals.conversionRate}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Banner List */}
              <View style={styles.sectionHeader}>
                <Ionicons name="list-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Banner Bazında QR Kod İstatistikleri</Text>
              </View>
              {renderQRTable()}
            </View>
          )}

          {activeTab === 2 && overviewData && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeader}>
                <Ionicons name="analytics-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Genel Bakış</Text>
              </View>
              
              {/* Banner Stats */}
              <View style={styles.overviewCard}>
                <View style={styles.overviewCardHeader}>
                  <Ionicons name="images-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.overviewCardTitle}>Banner İstatistikleri</Text>
                </View>
                <View style={styles.overviewItem}>
                  <View style={styles.overviewItemLeft}>
                    <Ionicons name="document-text-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={styles.overviewLabel}>Toplam Banner</Text>
                  </View>
                  <Text style={styles.overviewValue}>{overviewData.banners.total}</Text>
                </View>
                <View style={styles.overviewItem}>
                  <View style={styles.overviewItemLeft}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#10b981" />
                    <Text style={styles.overviewLabel}>Aktif Banner</Text>
                  </View>
                  <Text style={[styles.overviewValue, { color: '#10b981' }]}>
                    {overviewData.banners.active}
                  </Text>
                </View>
                <View style={styles.overviewItem}>
                  <View style={styles.overviewItemLeft}>
                    <Ionicons name="eye-outline" size={18} color="#3b82f6" />
                    <Text style={styles.overviewLabel}>Toplam Görüntülenme</Text>
                  </View>
                  <Text style={styles.overviewValue}>
                    {overviewData.clicks.views.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.overviewItem}>
                  <View style={styles.overviewItemLeft}>
                    <Ionicons name="hand-left-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.overviewLabel}>Toplam Tıklama</Text>
                  </View>
                  <Text style={[styles.overviewValue, { color: theme.colors.primary }]}>
                    {overviewData.clicks.clicks.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.overviewItem}>
                  <View style={styles.overviewItemLeft}>
                    <Ionicons name="trending-up-outline" size={18} color="#3b82f6" />
                    <Text style={styles.overviewLabel}>Tıklama Oranı</Text>
                  </View>
                  <Text style={[styles.overviewValue, { color: '#3b82f6' }]}>
                    %{overviewData.clicks.clickThroughRate}
                  </Text>
                </View>
                <View style={[styles.overviewItem, { borderBottomWidth: 0 }]}>
                  <View style={styles.overviewItemLeft}>
                    <Ionicons name="people-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={styles.overviewLabel}>Benzersiz Kullanıcı</Text>
                  </View>
                  <Text style={styles.overviewValue}>{overviewData.clicks.uniqueUsers}</Text>
                </View>
              </View>

              {/* QR Stats */}
              <View style={styles.overviewCard}>
                <View style={styles.overviewCardHeader}>
                  <Ionicons name="qr-code-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.overviewCardTitle}>QR Kod İstatistikleri</Text>
                </View>
                <View style={styles.overviewItem}>
                  <View style={styles.overviewItemLeft}>
                    <Ionicons name="add-circle-outline" size={18} color="#10b981" />
                    <Text style={styles.overviewLabel}>Oluşturulan QR Kod</Text>
                  </View>
                  <Text style={styles.overviewValue}>
                    {overviewData.qrCodes.generated.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.overviewItem}>
                  <View style={styles.overviewItemLeft}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#10b981" />
                    <Text style={styles.overviewLabel}>Kullanılan QR Kod</Text>
                  </View>
                  <Text style={[styles.overviewValue, { color: '#10b981' }]}>
                    {overviewData.qrCodes.used.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.overviewItem}>
                  <View style={styles.overviewItemLeft}>
                    <Ionicons name="close-circle-outline" size={18} color="#f59e0b" />
                    <Text style={styles.overviewLabel}>Kullanılmayan QR Kod</Text>
                  </View>
                  <Text style={[styles.overviewValue, { color: '#f59e0b' }]}>
                    {overviewData.qrCodes.unused.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.overviewItem}>
                  <View style={styles.overviewItemLeft}>
                    <Ionicons name="trending-up-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.overviewLabel}>Dönüşüm Oranı</Text>
                  </View>
                  <Text style={[styles.overviewValue, { color: theme.colors.primary }]}>
                    %{overviewData.qrCodes.conversionRate}
                  </Text>
                </View>
                <View style={[styles.overviewItem, { borderBottomWidth: 0 }]}>
                  <View style={styles.overviewItemLeft}>
                    <Ionicons name="people-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={styles.overviewLabel}>Benzersiz Kullanıcı</Text>
                  </View>
                  <Text style={styles.overviewValue}>{overviewData.qrCodes.uniqueUsers}</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  periodContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  periodScrollContent: {
    paddingHorizontal: 4,
  },
  periodChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  periodChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  periodChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  periodChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  overviewSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 18,
    width: (width - 48) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: '400',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 6,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  tabContent: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    minWidth: (width - 72) / 3,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  tableContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: theme.colors.white,
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  emptyTable: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTableText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  overviewCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  overviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5E7EB',
  },
  overviewCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  overviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  overviewItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  overviewLabel: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});

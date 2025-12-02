import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from './src/theme';

const { width } = Dimensions.get('window');

// Screens
import LoginScreen from './src/screens/LoginScreen';
import BrandProfileScreen from './src/screens/BrandProfileScreen';
import BannersScreen from './src/screens/BannersScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Tab Navigator Component
function TabNavigator({ currentUser, setCurrentUser, onLogout }) {
  const insets = useSafeAreaInsets();
  const isAdmin = currentUser?.isAdmin || false;
  const isBrand = currentUser?.userType === 'brand' || currentUser?.userType === 'eventBrand';
  
  return (
    <SafeAreaView style={styles.tabContainer} edges={['top', 'bottom']}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'BrandProfile') {
              iconName = focused ? 'storefront' : 'storefront-outline';
            } else if (route.name === 'Banners') {
              iconName = focused ? 'images' : 'images-outline';
            } else if (route.name === 'Analytics') {
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
            } else if (route.name === 'Admin') {
              iconName = focused ? 'shield-checkmark' : 'shield-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.colors.white,
            borderTopWidth: 0,
            borderTopColor: 'transparent',
            height: Platform.OS === 'android' ? 60 : 70,
            paddingBottom: Platform.OS === 'ios' ? (insets.bottom || 8) : 8,
            paddingTop: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          },
        })}
      >
        {isAdmin ? (
          <Tab.Screen
            name="Admin"
            options={{ tabBarLabel: 'Admin' }}
          >
            {() => <AdminPanelScreen currentUser={currentUser} />}
          </Tab.Screen>
        ) : (
          <>
            <Tab.Screen
              name="BrandProfile"
              options={{ tabBarLabel: 'Profil' }}
            >
              {() => <BrandProfileScreen currentUser={currentUser} setCurrentUser={setCurrentUser} onLogout={onLogout} />}
            </Tab.Screen>
            {isBrand && (
              <>
                <Tab.Screen
                  name="Banners"
                  options={{ tabBarLabel: 'Kampanyalar' }}
                >
                  {() => <BannersScreen currentUser={currentUser} />}
                </Tab.Screen>
                <Tab.Screen
                  name="Analytics"
                  options={{ tabBarLabel: 'İstatistikler' }}
                >
                  {() => <AnalyticsScreen currentUser={currentUser} />}
                </Tab.Screen>
              </>
            )}
          </>
        )}
      </Tab.Navigator>
    </SafeAreaView>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Uygulama açıldığında kullanıcı bilgilerini kontrol et
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const userDataStr = await AsyncStorage.getItem('userData');
        
        if (token && userDataStr) {
          const userData = JSON.parse(userDataStr);
          setCurrentUser(userData);
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('Login status check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  const handleLogin = async (data) => {
    try {
      // Token ve kullanıcı verilerini kaydet
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      
      setCurrentUser(data.user);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Login save error:', error);
      Alert.alert('Hata', 'Giriş bilgileri kaydedilemedi!');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      setCurrentUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Login screen
  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login">
              {() => <LoginScreen onLogin={handleLogin} />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  // Main app
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <TabNavigator 
          currentUser={currentUser} 
          setCurrentUser={setCurrentUser} 
          onLogout={handleLogout}
        />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  tabContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

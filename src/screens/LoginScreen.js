import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dashboardLogin } from '../services/apiService';
import theme from '../theme';
import faydanaLogo from '../../assets/faydana_logo.png';

// Ekran boyutlarını al
const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isMediumDevice = width >= 375 && width <= 414;
const isLargeDevice = width > 414;

export default function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.phone.trim()) {
      Alert.alert('Hata', 'Telefon numarası gerekli!');
      return false;
    }

    if (!formData.password.trim()) {
      Alert.alert('Hata', 'Şifre gerekli!');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await dashboardLogin(formData.phone, formData.password);
      
      if (response.success) {
        if (onLogin) {
          onLogin(response.data);
        }
      } else {
        Alert.alert('Hata', response.message || 'Telefon numarası veya şifre hatalı!');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Hata', 'Bağlantı hatası! Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image 
                source={faydanaLogo}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>Marka Paneli</Text>
            <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="call-outline" size={24} color={theme.colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Telefon Numarası"
                  placeholderTextColor={theme.colors.textLight}
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  autoCapitalize="none"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="lock-closed-outline" size={24} color={theme.colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Şifre"
                  placeholderTextColor={theme.colors.textLight}
                  secureTextEntry
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  autoCapitalize="none"
                />
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <Text style={styles.loginButtonText}>Giriş Yap</Text>
                )}
              </TouchableOpacity>

              {/* Info */}
              <Text style={styles.infoText}>
                Kayıt olmak için dashboard.faydana.com adresini ziyaret edin
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: isSmallDevice ? 20 : isMediumDevice ? 24 : 28,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 30 : isMediumDevice ? 35 : 40,
    marginTop: isSmallDevice ? 20 : isMediumDevice ? 30 : 40,
  },
  logo: {
    width: isSmallDevice ? 140 : isMediumDevice ? 160 : 180,
    height: isSmallDevice ? 70 : isMediumDevice ? 80 : 90,
  },
  title: {
    ...theme.typography.textStyles.h2,
    color: theme.colors.primary,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeights.bold,
    marginBottom: 8,
  },
  subtitle: {
    ...theme.typography.textStyles.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: isSmallDevice ? 30 : isMediumDevice ? 35 : 40,
  },
  formContainer: {
    gap: isSmallDevice ? 16 : 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: isSmallDevice ? 12 : isMediumDevice ? 14 : 16,
    minHeight: theme.spacing.layout.inputHeight,
  },
  inputIconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    ...theme.typography.textStyles.body,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
    height: theme.spacing.layout.inputHeight,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.md,
    paddingVertical: isSmallDevice ? 14 : isMediumDevice ? 16 : 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.spacing.layout.buttonHeight,
    marginTop: 8,
    ...theme.shadows?.medium,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    ...theme.typography.textStyles.button,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  infoText: {
    ...theme.typography.textStyles.caption,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
});


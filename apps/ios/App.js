import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { generateStrongPassword } from '@password-manager/core';

export default function App() {
  const [password, setPassword] = useState('Toque no botão para gerar uma senha forte.');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [bioStatus, setBioStatus] = useState('Biometria opcional desativada.');

  async function handleBiometricUnlock() {
    const isAvailable = await LocalAuthentication.hasHardwareAsync();

    if (!isAvailable) {
      setBioStatus('Este dispositivo não possui biometria disponível.');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear cofre com biometria',
      fallbackLabel: 'Usar senha'
    });

    if (result.success) {
      setIsUnlocked(true);
      setBioStatus('Cofre desbloqueado com biometria.');
      return;
    }

    setBioStatus('Falha na biometria. Tente novamente.');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>PasswordManager (iOS)</Text>
        <Text style={styles.subtitle}>v0.4.0: hardening com desbloqueio biométrico opcional.</Text>
        <Button title="Desbloquear com biometria" onPress={handleBiometricUnlock} />
        <Text style={styles.status}>{bioStatus}</Text>

        {isUnlocked && (
          <>
            <Button
              title="Gerar senha"
              onPress={() =>
                setPassword(
                  generateStrongPassword({
                    length: 20,
                    useDigits: true,
                    useLowercase: true,
                    useUppercase: true,
                    useSymbols: true
                  })
                )
              }
            />
            <Text style={styles.password}>{password}</Text>
          </>
        )}
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    backgroundColor: '#121a2b',
    borderColor: '#1f2a44',
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    width: '90%'
  },
  title: {
    color: '#e5e7eb',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10
  },
  subtitle: {
    color: '#cbd5e1',
    marginBottom: 14
  },
  status: {
    color: '#86efac',
    marginVertical: 12
  },
  password: {
    color: '#93c5fd',
    marginTop: 16
  }
});

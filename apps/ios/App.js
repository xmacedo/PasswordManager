import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { generateStrongPassword } from '@password-manager/core';

export default function App() {
  const [password, setPassword] = useState('Toque no botão para gerar uma senha forte.');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>PasswordManager (iOS)</Text>
        <Text style={styles.subtitle}>Base inicial do app com geração de senha forte.</Text>
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
  password: {
    color: '#93c5fd',
    marginTop: 16
  }
});

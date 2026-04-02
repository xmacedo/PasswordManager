import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Switch, Text, View } from 'react-native';

import {
  appendAuditEvent,
  assessPasswordBreachRisk,
  createAuditLog,
  createSessionLock,
  generateStrongPassword,
  isSessionLocked,
  lockSessionLock,
  touchSessionLock,
  unlockSessionLock
} from '@password-manager/core';

export default function App() {
  const [password, setPassword] = useState('Toque no botão para gerar uma senha forte.');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [sessionLock, setSessionLock] = useState(() => unlockSessionLock(createSessionLock({ timeoutMs: 60_000 })));
  const [auditLog, setAuditLog] = useState(createAuditLog());

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionLock((current) => (isSessionLocked(current) ? lockSessionLock(current) : current));
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  const breach = useMemo(() => assessPasswordBreachRisk(password), [password]);

  function log(type, metadata = {}) {
    setAuditLog((current) => appendAuditEvent(current, { type, metadata, actor: 'ios-user' }));
  }

  function handleGenerate() {
    const value = generateStrongPassword({
      length: 20,
      useDigits: true,
      useLowercase: true,
      useUppercase: true,
      useSymbols: true
    });

    setPassword(value);
    setSessionLock((current) => touchSessionLock(current));
    log('security.password_generated');
  }

  function handleUnlock() {
    const method = biometricEnabled ? 'biometric-simulated' : 'master-password';
    setSessionLock((current) => unlockSessionLock(current, method));
    log('security.unlock_success', { method });
  }

  if (isSessionLocked(sessionLock)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Cofre bloqueado</Text>
          <Text style={styles.subtitle}>Sessão expirada por inatividade.</Text>
          <Button title={biometricEnabled ? 'Desbloquear com biometria (opcional)' : 'Desbloquear'} onPress={handleUnlock} />
        </View>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>PasswordManager (iOS) v0.4.0</Text>
        <Text style={styles.subtitle}>Hardening com timeout, biometria opcional e auditoria.</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Biometria opcional</Text>
          <Switch value={biometricEnabled} onValueChange={(value) => {
            setBiometricEnabled(value);
            log('security.biometric_toggled', { enabled: value });
          }} />
        </View>

        <Button title="Gerar senha" onPress={handleGenerate} />
        <Text style={styles.password}>{password}</Text>

        {breach.level !== 'ok' && <Text style={styles.risk}>⚠️ {breach.reasons[0]}</Text>}

        <Button
          title="Bloquear agora"
          onPress={() => {
            setSessionLock((current) => lockSessionLock(current));
            log('security.session_locked');
          }}
        />

        <Text style={styles.auditTitle}>Eventos recentes: {auditLog.length}</Text>
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
    marginVertical: 16
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  label: {
    color: '#e2e8f0'
  },
  risk: {
    color: '#fda4af',
    marginBottom: 12
  },
  auditTitle: {
    color: '#94a3b8',
    marginTop: 14
  }
});

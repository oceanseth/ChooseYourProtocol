import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { theme } from '../lib/theme';
import { loadStack } from '../lib/storage';
import MetricPill from '../components/MetricPill';

export default function StackScreen() {
  const router = useRouter();
  const [stack, setStack] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setStack(await loadStack());
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return (
    <View style={styles.wrap}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.accent}
            onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}
          />
        }
      >
        <Text style={styles.h1}>Your Stack</Text>
        <Text style={styles.sub}>The protocol groups you're proving progress in.</Text>

        {stack.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Your stack is empty</Text>
            <Text style={styles.emptyText}>Talk to Max about a goal and he'll build your first protocol group.</Text>
          </View>
        )}

        {stack.map((g) => (
          <View key={g.id} style={styles.card}>
            <Text style={styles.cardTitle}>{g.title}</Text>
            {!!g.goal && <Text style={styles.cardGoal}>Goal: {g.goal}</Text>}
            <Text style={styles.cardProto}>{g.protocol?.title}</Text>
            <Text style={styles.cardCadence}>{g.protocol?.cadence} · coached by Max</Text>
            <View style={styles.metricsRow}>
              {(g.metrics || []).map((m, i) => <MetricPill key={i} metric={m} />)}
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/')}>
        <Text style={styles.fabText}>+ New goal with Max</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg },
  h1: { color: theme.text, fontSize: 28, fontWeight: '800' },
  sub: { color: theme.textDim, fontSize: 14, marginTop: 4, marginBottom: 20 },
  empty: { backgroundColor: theme.card, borderRadius: 16, padding: 24, borderColor: theme.border, borderWidth: 1, alignItems: 'center' },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  emptyText: { color: theme.textDim, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  card: { backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 14, borderColor: theme.border, borderWidth: 1 },
  cardTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
  cardGoal: { color: theme.accent, fontSize: 12, marginTop: 4, fontWeight: '600' },
  cardProto: { color: theme.text, fontSize: 14, marginTop: 8 },
  cardCadence: { color: theme.textDim, fontSize: 12, marginTop: 4, marginBottom: 12 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  fab: { position: 'absolute', bottom: 28, left: 16, right: 16, backgroundColor: theme.accent, borderRadius: 16, padding: 16, alignItems: 'center' },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15 }
});

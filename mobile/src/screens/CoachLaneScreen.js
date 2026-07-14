import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { theme } from '../lib/theme';
import { getGroup, getCoachLane } from '../lib/api';

// 1:1 Coach lane — the private (audience:user) surface for the current member.
// Rendered as a conversation with the managing agent, NOT a feed. Actionable
// check-ins deep-link straight into the capture flow via the `action` hint.
// Privacy is structural: this screen only ever fetches audience:user&as=<me>,
// and the shared group feed only fetches audience:group — they can't cross.

function timeAgo(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export default function CoachLaneScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams();
  const gid = groupId || 'pg_skin_warmcold';
  const [events, setEvents] = useState([]);
  const [coachName, setCoachName] = useState('Coach');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const g = await getGroup(gid);
      const me = g.members.find((m) => m.user_id === 'usr_you') || g.members.find((m) => !m.is_synthetic);
      setCoachName(`${g.title} Coach`);
      const lane = await getCoachLane(gid, me && me.user_id);
      // oldest → newest for a natural conversation read
      const evs = (lane.events || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setEvents(evs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goCapture = (metricId) =>
    router.push({ pathname: '/capture/[groupId]', params: { groupId: gid, metricId } });

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.accent} /></View>;
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errTitle}>Couldn’t load your coach</Text>
        <Text style={styles.errText}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={load}><Text style={styles.retryTxt}>Retry</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={theme.accent}
        onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View style={styles.hero}>
        <View style={styles.avatar}><Text style={{ fontSize: 22 }}>💬</Text></View>
        <Text style={styles.heroName}>{coachName}</Text>
        <Text style={styles.heroSub}>Your private accountability coach. Only you see this lane.</Text>
      </View>

      {events.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>Your coach will nudge you when a check-in is due and celebrate your quiet wins here.</Text>
        </View>
      )}

      {events.map((e) => (
        <View key={e.id} style={styles.bubbleRow}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{e.summary}</Text>
            {e.action && e.action.kind === 'capture' && (
              <TouchableOpacity style={styles.action} activeOpacity={0.85} onPress={() => goCapture(e.metric_id)}>
                <Text style={styles.actionTxt}>{e.action.label} →</Text>
              </TouchableOpacity>
            )}
            {e.action && e.action.kind === 'log' && (
              <TouchableOpacity style={styles.action} activeOpacity={0.85} onPress={() => goCapture(e.metric_id)}>
                <Text style={styles.actionTxt}>{e.action.label} →</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.time}>{timeAgo(e.created_at)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errTitle: { color: theme.text, fontWeight: '800', fontSize: 16 },
  errText: { color: theme.textDim, fontSize: 13, marginTop: 8, textAlign: 'center' },
  retry: { marginTop: 16, backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 },
  retryTxt: { color: '#fff', fontWeight: '800' },

  hero: { alignItems: 'center', paddingVertical: 18 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(124,92,255,0.20)', alignItems: 'center', justifyContent: 'center' },
  heroName: { color: theme.text, fontSize: 18, fontWeight: '800', marginTop: 10 },
  heroSub: { color: theme.textDim, fontSize: 12, marginTop: 4, textAlign: 'center', paddingHorizontal: 30, lineHeight: 17 },

  empty: { backgroundColor: theme.card, borderRadius: 16, padding: 24, borderColor: theme.border, borderWidth: 1, alignItems: 'center', marginTop: 8 },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  emptyText: { color: theme.textDim, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },

  bubbleRow: { marginBottom: 14, alignItems: 'flex-start' },
  bubble: { backgroundColor: theme.card, borderColor: '#3A2F5C', borderWidth: 1, borderRadius: 16, borderTopLeftRadius: 4, padding: 14, maxWidth: '88%' },
  bubbleText: { color: theme.text, fontSize: 14, lineHeight: 20 },
  action: { alignSelf: 'flex-start', marginTop: 12, backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  actionTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  time: { color: theme.textDim, fontSize: 11, marginTop: 5, marginLeft: 6 }
});

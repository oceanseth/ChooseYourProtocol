import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { theme } from '../lib/theme';
import { getGroup, leaveGroup } from '../lib/api';
import { showSyntheticLabels } from '../lib/disclosure';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';

const proofLabel = { self_report: 'Self', photo: 'Photo', device: 'Device', lab: 'Lab' };
const feedIcon = { win: '✅', streak: '🔥', milestone: '🏆', check_in: '🔔' };

function timeAgo(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export default function GroupScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const groupId = id || 'pg_skin_warmcold';
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const g = await getGroup(groupId);
      setGroup(g);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  const [leaving, setLeaving] = useState(false);

  const doLeave = useCallback(async () => {
    try {
      setLeaving(true);
      const meMember = group && group.members.find((m) => m.user_id === 'usr_you');
      const r = await leaveGroup(groupId, meMember && meMember.user_id);
      if (r.group_outcome === 'deleted') {
        // Group closed with the last real member — go home, it no longer exists.
        router.replace('/stack');
      } else {
        // 'alive' or 'exempt' (freshly-seeded still in outreach window) — group persists.
        router.replace('/stack');
      }
    } catch (e) {
      Alert.alert('Couldn\u2019t leave', e.message);
    } finally {
      setLeaving(false);
    }
  }, [groupId, router]);

  const confirmLeave = useCallback(() => {
    // real_member_count drives light-vs-heavy confirm (contract v3.1 §3.7).
    const lastReal = (group && group.real_member_count != null ? group.real_member_count : 1) <= 1;
    if (lastReal) {
      Alert.alert(
        'Leave and close this group?',
        "You\u2019re the only real member. Leaving will close this group and its AI-seeded members retire. This can\u2019t be undone.",
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave & close', style: 'destructive', onPress: doLeave }
        ]
      );
    } else {
      Alert.alert(
        `Leave ${group ? group.title : 'this group'}?`,
        'You can rejoin anytime.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: doLeave }
        ]
      );
    }
  }, [group, doLeave]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={theme.accent} /></View>;
  }
  if (error || !group) {
    return (
      <View style={styles.center}>
        <Text style={styles.errTitle}>Couldn’t load this group</Text>
        <Text style={styles.errText}>{error || 'Unknown error'}</Text>
        <TouchableOpacity style={styles.retry} onPress={load}><Text style={styles.retryTxt}>Retry</Text></TouchableOpacity>
      </View>
    );
  }

  const me = group.members.find((m) => m.user_id === 'usr_you') || group.members.find((m) => !m.is_synthetic);
  const dueMetric = (group.metrics_state || []).find((s) => !s.logged_today);
  const dueMetricObj = dueMetric && group.metrics.find((m) => m.id === dueMetric.metric_id);
  const showLabels = showSyntheticLabels();

  const goCapture = (metricId) =>
    router.push({ pathname: '/capture/[groupId]', params: { groupId: group.id, metricId } });

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={theme.accent}
        onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.h1}>{group.title}</Text>
        <Text style={styles.goal}>GOAL · {(group.goal_label || '').toUpperCase()}</Text>
        <Text style={styles.proto}>{group.protocol?.title}</Text>
        <Text style={styles.cadence}>{group.protocol?.cadence} · coached by Max</Text>
      </View>

      {/* Today card — the "now" state that makes it an accountability app */}
      {dueMetricObj ? (
        <TouchableOpacity style={styles.today} activeOpacity={0.85}
          onPress={() => goCapture(dueMetricObj.id)}>
          <View style={styles.ring}><Text style={styles.ringTxt}>◷</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.todayTitle}>Today isn’t logged yet</Text>
            <Text style={styles.todaySub}>{dueMetricObj.title} · {proofLabel[dueMetricObj.proof_tiers?.[0]] || 'Log'} · due today</Text>
          </View>
          <View style={styles.cta}><Text style={styles.ctaTxt}>
            {dueMetricObj.value_type === 'photo_derived' ? 'Take photo' : 'Log'}
          </Text></View>
        </TouchableOpacity>
      ) : (
        <View style={[styles.today, styles.todayDone]}>
          <View style={[styles.ring, styles.ringDone]}><Text style={styles.ringTxt}>✓</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.todayTitle}>All caught up today</Text>
            <Text style={styles.todaySub}>Streak {me?.streak?.current ?? 0} days — nice.</Text>
          </View>
        </View>
      )}

      {/* Metrics */}
      <View style={styles.sec}>
        <Text style={styles.secTitle}>METRICS</Text>
        <View style={styles.pills}>
          {group.metrics.map((m) => {
            const st = (group.metrics_state || []).find((s) => s.metric_id === m.id);
            const done = st?.logged_today;
            return (
              <View key={m.id} style={styles.pill}>
                <Text style={styles.pillTitle}>{m.title}</Text>
                <Text style={styles.pillMeta}>{m.unit} · {m.cadence} · {proofLabel[m.proof_tiers?.[0]] || m.proof_tiers?.[0]}</Text>
                <Text style={[styles.pillState, done ? styles.stDone : styles.stDue]}>
                  {done ? `✓ Logged` : '● Due'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Members */}
      <View style={styles.sec}>
        <Text style={styles.secTitle}>MEMBERS · {group.member_count}</Text>
        {showLabels && group.synthetic_count > 0 && (
          <View style={styles.agg}>
            <Text style={styles.aggTxt}>
              🌱 {group.synthetic_count} of {group.member_count} members are AI-seeded while this group grows. They’re real activity patterns, not real people.
            </Text>
          </View>
        )}
        {group.members.map((m) => (
          <View key={m.user_id} style={styles.mrow}>
            <Avatar name={m.display_name} uri={m.avatar_url} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.mnRow}>
                <Text style={styles.mn}>{m.display_name}</Text>
                {m.user_id === (me && me.user_id) && <Chip label="YOU" tone="you" />}
                {m.role === 'proposer' && <Chip label="PROPOSER" tone="mod" />}
                {m.role === 'moderator' && <Chip label="MOD" tone="mod" />}
                {showLabels && m.is_synthetic && <Chip label="AI-SEEDED" tone="ai" />}
              </View>
              <Text style={styles.mmeta}>
                {m.streak?.logged_today ? 'logged today' : 'not logged today'} · best {m.streak?.best}d
              </Text>
            </View>
            <View style={styles.streak}>
              <Text style={styles.streakNum}>🔥 {m.streak?.current ?? 0}</Text>
              <Text style={styles.streakLb}>day streak</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Feed — wins & actionable check-ins */}
      <View style={styles.sec}>
        <Text style={styles.secTitle}>WINS & CHECK-INS</Text>
        {group.feed.map((f) => {
          const actionable = f.type === 'check_in' && f.action;
          const hideActor = !showLabels && f.actor?.is_synthetic; // B posture: keep synthetic actors present but unlabeled
          return (
            <View key={f.id} style={styles.fe}>
              <View style={[styles.fi, styles[`fi_${f.type}`]]}><Text style={styles.fiTxt}>{feedIcon[f.type]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ft}>
                  <Text style={styles.ftName}>{f.actor?.display_name}</Text>
                  {showLabels && f.actor?.is_synthetic ? <Text style={styles.ftAi}> · AI-seeded</Text> : null}
                  {'  '}{f.summary}
                </Text>
                <View style={styles.fmeta}>
                  {f.proof_tier ? <View style={styles.pbadge}><Text style={styles.pbadgeTxt}>{proofLabel[f.proof_tier]}</Text></View> : null}
                  <Text style={styles.fmetaTxt}>{timeAgo(f.created_at)}</Text>
                </View>
                {actionable && (
                  <TouchableOpacity style={styles.feAction} activeOpacity={0.85}
                    onPress={() => {
                      if (f.action.kind === 'capture') goCapture(f.metric_id);
                      else if (f.action.kind === 'log') goCapture(f.metric_id);
                    }}>
                    <Text style={styles.feActionTxt}>{f.action.label} →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Leave group — light or heavy confirm depending on real_member_count */}
      <View style={styles.sec}>
        <TouchableOpacity style={styles.leaveBtn} activeOpacity={0.8} disabled={leaving} onPress={confirmLeave}>
          <Text style={styles.leaveTxt}>{leaving ? 'Leaving\u2026' : 'Leave group'}</Text>
        </TouchableOpacity>
        {(group.real_member_count != null ? group.real_member_count : 1) <= 1 && (
          <Text style={styles.leaveHint}>You\u2019re the only real member — leaving closes this group.</Text>
        )}
      </View>
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

  header: { padding: 18, paddingTop: 16 },
  h1: { color: theme.text, fontSize: 25, fontWeight: '800' },
  goal: { color: theme.accent, fontSize: 12, fontWeight: '700', marginTop: 4 },
  proto: { color: theme.text, fontSize: 13, marginTop: 8, lineHeight: 19 },
  cadence: { color: theme.textDim, fontSize: 12, marginTop: 4 },

  today: { marginHorizontal: 18, marginBottom: 4, backgroundColor: theme.accentSoft, borderColor: '#3A2F5C', borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center' },
  todayDone: { backgroundColor: 'rgba(55,214,122,0.08)', borderColor: '#2B6B45' },
  ring: { width: 52, height: 52, borderRadius: 26, borderWidth: 4, borderColor: theme.warn, alignItems: 'center', justifyContent: 'center' },
  ringDone: { borderColor: theme.good },
  ringTxt: { color: theme.text, fontSize: 20 },
  todayTitle: { color: theme.text, fontWeight: '800', fontSize: 15, marginLeft: 14 },
  todaySub: { color: theme.textDim, fontSize: 12, marginTop: 3, marginLeft: 14 },
  cta: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },

  sec: { paddingHorizontal: 18, paddingTop: 18 },
  secTitle: { color: theme.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  pills: { flexDirection: 'row', flexWrap: 'wrap' },
  pill: { backgroundColor: theme.accentSoft, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 12, marginRight: 8, marginBottom: 8 },
  pillTitle: { color: theme.text, fontWeight: '700', fontSize: 14 },
  pillMeta: { color: theme.textDim, fontSize: 11, marginTop: 2 },
  pillState: { fontSize: 11, marginTop: 6, fontWeight: '800' },
  stDone: { color: theme.good },
  stDue: { color: theme.warn },

  agg: { backgroundColor: 'rgba(124,92,255,0.10)', borderColor: '#3A2F5C', borderWidth: 1, borderRadius: 12, padding: 11, marginBottom: 10 },
  aggTxt: { color: '#C9BDFF', fontSize: 12, lineHeight: 17 },

  mrow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomColor: theme.border, borderBottomWidth: 1 },
  mnRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  mn: { color: theme.text, fontWeight: '700', fontSize: 14 },
  mmeta: { color: theme.textDim, fontSize: 12, marginTop: 3 },
  streak: { alignItems: 'flex-end' },
  streakNum: { color: theme.text, fontWeight: '800', fontSize: 15 },
  streakLb: { color: theme.textDim, fontSize: 10 },

  fe: { flexDirection: 'row', paddingVertical: 11, borderBottomColor: theme.border, borderBottomWidth: 1 },
  fi: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  fi_win: { backgroundColor: 'rgba(55,214,122,0.14)' },
  fi_streak: { backgroundColor: 'rgba(255,176,32,0.14)' },
  fi_milestone: { backgroundColor: 'rgba(124,92,255,0.16)' },
  fi_check_in: { backgroundColor: 'rgba(154,154,168,0.14)' },
  fiTxt: { fontSize: 15 },
  ft: { color: theme.text, fontSize: 13, lineHeight: 19 },
  ftName: { fontWeight: '800' },
  ftAi: { color: '#B8A6FF', fontSize: 12, fontWeight: '700' },
  fmeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  fmetaTxt: { color: theme.textDim, fontSize: 11 },
  pbadge: { backgroundColor: 'rgba(124,92,255,0.16)', borderColor: '#4A3D78', borderWidth: 1, borderRadius: 5, paddingVertical: 1, paddingHorizontal: 6, marginRight: 7 },
  pbadgeTxt: { color: '#B8A6FF', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  feAction: { alignSelf: 'flex-start', marginTop: 9, backgroundColor: theme.accent, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  feActionTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  leaveBtn: { borderColor: theme.danger, borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  leaveTxt: { color: theme.danger, fontWeight: '800', fontSize: 14 },
  leaveHint: { color: theme.textDim, fontSize: 11, textAlign: 'center', marginTop: 8, paddingHorizontal: 16, lineHeight: 16 }
});

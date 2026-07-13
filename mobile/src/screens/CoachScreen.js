import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../lib/theme';
import { resolveGoal } from '../lib/api';
import { addGroup } from '../lib/storage';
import MetricPill from '../components/MetricPill';

export default function CoachScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState([
    { role: 'max', text: "I'm Max, your accountability coach. Tell me a goal you want to hit — even a vague one like \"I want good skin\" — and I'll turn it into a protocol we can actually measure." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState(null);
  const scrollRef = useRef(null);

  const push = (m) => setMessages((prev) => [...prev, m]);

  async function onSend() {
    const goal = input.trim();
    if (!goal || loading) return;
    setInput('');
    setProposal(null);
    push({ role: 'user', text: goal });
    setLoading(true);
    try {
      const r = await resolveGoal(goal);
      push({
        role: 'max',
        text: r.coach_note || "Here's the protocol I'd run for that.",
        proposal: r
      });
      setProposal(r);
    } catch (e) {
      push({ role: 'max', text: `I couldn't reach the coach service. Is the backend running? (${e.message})` });
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  async function onAccept() {
    if (!proposal) return;
    await addGroup({
      title: proposal.group_title || proposal.protocol?.title,
      protocol: proposal.protocol,
      metrics: proposal.metrics || [],
      goal: proposal.goal
    });
    router.push('/stack');
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === 'user' ? styles.user : styles.max]}>
            {m.role === 'max' && <Text style={styles.maxTag}>MAX</Text>}
            <Text style={styles.bubbleText}>{m.text}</Text>
            {m.proposal && (
              <View style={styles.proposal}>
                <Text style={styles.protoTitle}>{m.proposal.protocol?.title}</Text>
                <Text style={styles.protoDesc}>{m.proposal.protocol?.description}</Text>
                <Text style={styles.cadence}>Cadence: {m.proposal.protocol?.cadence}</Text>
                <Text style={styles.metricsLabel}>What we'll measure</Text>
                <View style={styles.metricsRow}>
                  {(m.proposal.metrics || []).map((mt, j) => <MetricPill key={j} metric={mt} />)}
                </View>
              </View>
            )}
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.max]}>
            <Text style={styles.maxTag}>MAX</Text>
            <ActivityIndicator color={theme.accent} />
          </View>
        )}
      </ScrollView>

      {proposal && !loading && (
        <TouchableOpacity style={styles.accept} onPress={onAccept}>
          <Text style={styles.acceptText}>Create protocol group + add to my stack</Text>
        </TouchableOpacity>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Tell Max a goal…"
          placeholderTextColor={theme.textDim}
          onSubmitEditing={onSend}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  bubble: { borderRadius: 16, padding: 14, marginBottom: 12, maxWidth: '92%' },
  user: { backgroundColor: theme.accent, alignSelf: 'flex-end' },
  max: { backgroundColor: theme.card, alignSelf: 'flex-start', borderColor: theme.border, borderWidth: 1 },
  maxTag: { color: theme.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  bubbleText: { color: theme.text, fontSize: 15, lineHeight: 21 },
  proposal: { marginTop: 12, borderTopColor: theme.border, borderTopWidth: 1, paddingTop: 12 },
  protoTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  protoDesc: { color: theme.textDim, fontSize: 13, marginTop: 4, lineHeight: 19 },
  cadence: { color: theme.accent, fontSize: 12, marginTop: 8, fontWeight: '600' },
  metricsLabel: { color: theme.textDim, fontSize: 11, marginTop: 14, marginBottom: 8, letterSpacing: 1, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  accept: { backgroundColor: theme.good, marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 15, alignItems: 'center' },
  acceptText: { color: '#062a15', fontWeight: '800', fontSize: 15 },
  inputRow: { flexDirection: 'row', padding: 12, borderTopColor: theme.border, borderTopWidth: 1, backgroundColor: theme.card },
  input: { flex: 1, backgroundColor: theme.cardAlt, color: theme.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  sendBtn: { marginLeft: 8, backgroundColor: theme.accent, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '700' }
});

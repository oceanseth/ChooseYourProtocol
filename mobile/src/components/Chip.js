import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TONES = {
  ai:  { bg: 'rgba(124,92,255,0.18)', fg: '#B8A6FF', bd: '#4A3D78' },
  you: { bg: 'rgba(55,214,122,0.15)', fg: '#37D67A', bd: '#2B6B45' },
  mod: { bg: 'rgba(255,176,32,0.13)', fg: '#FFB020', bd: '#6B5320' }
};

export default function Chip({ label, tone = 'mod' }) {
  const t = TONES[tone] || TONES.mod;
  return (
    <View style={[styles.chip, { backgroundColor: t.bg, borderColor: t.bd }]}>
      <Text style={[styles.txt, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 6, borderWidth: 1, paddingVertical: 2, paddingHorizontal: 7, marginLeft: 6 },
  txt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }
});

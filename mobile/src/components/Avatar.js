import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

const PALETTE = ['#7C5CFF', '#37D67A', '#FFB020', '#FF5C7C', '#4A9FFF', '#E56AC0', '#3EC9C9', '#C98A3E'];

function initials(name = '?') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Avatar({ name, uri, size = 38 }) {
  const bg = PALETTE[(name?.charCodeAt(0) || 0) % PALETTE.length];
  if (uri) {
    return <Image source={{ uri }} style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]} />;
  }
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.txt, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  img: { backgroundColor: theme.cardAlt },
  txt: { color: '#fff', fontWeight: '800' }
});

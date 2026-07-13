import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

const proofLabel = {
  self_report: 'Self',
  photo: 'Photo',
  device: 'Device',
  lab: 'Lab'
};

export default function MetricPill({ metric }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.title}>{metric.title}</Text>
      <Text style={styles.meta}>
        {metric.unit} · {metric.cadence} · {proofLabel[metric.proof_tier] || metric.proof_tier}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8
  },
  title: { color: theme.text, fontWeight: '600', fontSize: 14 },
  meta: { color: theme.textDim, fontSize: 11, marginTop: 2 }
});

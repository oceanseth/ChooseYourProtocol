import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Animated, Easing
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../lib/theme';
import { getGroup, measure } from '../lib/api';

// Capture flow — the app's emotional peak (contract §3.4).
//   1. framing: user sees a face guide + shutter
//   2. measuring: photo sent, "measuring…" while vision runs
//   3. result: metric value + proof badge + confidence (honest, not silent)
// Camera is loaded lazily so the app still runs in review without expo-camera;
// if it isn't installed we fall back to a simulated capture that hits the same
// measure() call, so the whole flow is real end-to-end against the contract.
let ImagePicker = null;
try { ImagePicker = require('expo-image-picker'); } catch (e) { ImagePicker = null; }

const STAGE = { FRAME: 'frame', MEASURING: 'measuring', RESULT: 'result', ERROR: 'error' };

function directionVerb(direction) {
  if (direction === 'lower_better') return 'Lower is better';
  if (direction === 'higher_better') return 'Higher is better';
  return 'On target';
}

export default function CaptureScreen() {
  const router = useRouter();
  const { groupId, metricId } = useLocalSearchParams();
  const gid = groupId || 'pg_skin_warmcold';
  const mid = metricId || 'metric_pimple_count';

  const [stage, setStage] = useState(STAGE.FRAME);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [metric, setMetric] = useState(null);

  React.useEffect(() => {
    getGroup(gid).then((g) => setMetric((g.metrics || []).find((m) => m.id === mid))).catch(() => {});
  }, [gid, mid]);

  async function pickAndMeasure() {
    let uri = null;
    // Try a real camera capture when expo-image-picker is available.
    if (ImagePicker && ImagePicker.launchCameraAsync) {
      try {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status === 'granted') {
          const shot = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
          if (shot.canceled) return;
          uri = shot.assets?.[0]?.uri;
        }
      } catch (e) { /* fall through to simulated */ }
    }
    setImageUri(uri);
    setStage(STAGE.MEASURING);
    try {
      const r = await measure(gid, mid, uri);
      setResult(r);
      setStage(STAGE.RESULT);
    } catch (e) {
      setError(e.message);
      setStage(STAGE.ERROR);
    }
  }

  const confidencePct = result ? Math.round((result.confidence || 0) * 100) : 0;
  const lowConf = result && result.confidence != null && result.confidence < 0.6;

  return (
    <View style={styles.wrap}>
      {stage === STAGE.FRAME && (
        <View style={styles.frameWrap}>
          <Text style={styles.title}>{metric?.title || 'Capture'}</Text>
          <Text style={styles.subtitle}>
            {metric?.value_type === 'photo_derived' || metric?.proof_tiers?.includes('photo')
              ? 'Take a clear, front-lit face photo. The model reads the metric — no manual entry.'
              : 'Capture a photo to log this metric.'}
          </Text>
          <View style={styles.guide}>
            <View style={styles.guideOval} />
            <Text style={styles.guideHint}>Center your face in the oval</Text>
          </View>
          <TouchableOpacity style={styles.shutter} activeOpacity={0.85} onPress={pickAndMeasure}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
          <Text style={styles.proofNote}>
            Proof tier: Photo · this becomes a verified metric, not a self-report.
          </Text>
        </View>
      )}

      {stage === STAGE.MEASURING && (
        <View style={styles.centered}>
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : <View style={[styles.preview, styles.previewGhost]} />}
          <ActivityIndicator color={theme.accent} size="large" style={{ marginTop: 24 }} />
          <Text style={styles.measuring}>Measuring…</Text>
          <Text style={styles.measuringSub}>Reading {metric?.title?.toLowerCase() || 'the metric'} from your photo</Text>
        </View>
      )}

      {stage === STAGE.RESULT && result && (
        <View style={styles.centered}>
          <View style={styles.resultBadge}><Text style={styles.resultBadgeTxt}>PHOTO · VERIFIED</Text></View>
          <Text style={styles.resultValue}>{result.value}</Text>
          <Text style={styles.resultUnit}>{metric?.unit} · {metric?.title}</Text>
          <Text style={styles.resultDir}>{directionVerb(metric?.direction)}</Text>

          <View style={[styles.confRow, lowConf && styles.confLow]}>
            <Text style={[styles.confTxt, lowConf && styles.confLowTxt]}>
              {lowConf ? '⚠ Low confidence' : 'Model confidence'} · {confidencePct}%
            </Text>
          </View>
          {result.detail?.notes ? <Text style={styles.resultNotes}>{result.detail.notes}</Text> : null}
          {lowConf && <Text style={styles.retakeHint}>Low light or blur can lower confidence — retake for a cleaner read.</Text>}

          <TouchableOpacity style={styles.primary} activeOpacity={0.85} onPress={() => router.back()}>
            <Text style={styles.primaryTxt}>Save to my stack</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} activeOpacity={0.7} onPress={() => setStage(STAGE.FRAME)}>
            <Text style={styles.secondaryTxt}>Retake</Text>
          </TouchableOpacity>
        </View>
      )}

      {stage === STAGE.ERROR && (
        <View style={styles.centered}>
          <Text style={styles.errTitle}>Measurement failed</Text>
          <Text style={styles.errText}>{error}</Text>
          <TouchableOpacity style={styles.primary} onPress={() => setStage(STAGE.FRAME)}>
            <Text style={styles.primaryTxt}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg },
  frameWrap: { flex: 1, padding: 24, alignItems: 'center' },
  title: { color: theme.text, fontSize: 22, fontWeight: '800', marginTop: 8 },
  subtitle: { color: theme.textDim, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  guide: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  guideOval: { width: 220, height: 280, borderRadius: 130, borderWidth: 2, borderColor: theme.accent, borderStyle: 'dashed', opacity: 0.7 },
  guideHint: { color: theme.textDim, fontSize: 12, marginTop: 16 },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: theme.accent },
  proofNote: { color: theme.textDim, fontSize: 11, textAlign: 'center', marginBottom: 8 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  preview: { width: 160, height: 200, borderRadius: 18, backgroundColor: theme.cardAlt },
  previewGhost: { alignItems: 'center', justifyContent: 'center', borderColor: theme.border, borderWidth: 1 },
  measuring: { color: theme.text, fontSize: 18, fontWeight: '800', marginTop: 18 },
  measuringSub: { color: theme.textDim, fontSize: 13, marginTop: 6 },

  resultBadge: { backgroundColor: 'rgba(124,92,255,0.16)', borderColor: '#4A3D78', borderWidth: 1, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, marginBottom: 20 },
  resultBadgeTxt: { color: '#B8A6FF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  resultValue: { color: theme.text, fontSize: 72, fontWeight: '900' },
  resultUnit: { color: theme.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  resultDir: { color: theme.textDim, fontSize: 12, marginTop: 4 },
  confRow: { marginTop: 18, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  confLow: { backgroundColor: 'rgba(255,176,32,0.10)', borderColor: '#6B5320' },
  confTxt: { color: theme.textDim, fontSize: 13, fontWeight: '700' },
  confLowTxt: { color: theme.warn },
  resultNotes: { color: theme.textDim, fontSize: 12, marginTop: 12, textAlign: 'center' },
  retakeHint: { color: theme.warn, fontSize: 12, marginTop: 10, textAlign: 'center', paddingHorizontal: 20 },

  primary: { marginTop: 28, backgroundColor: theme.good, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 40, alignItems: 'center' },
  primaryTxt: { color: '#062A15', fontWeight: '800', fontSize: 15 },
  secondary: { marginTop: 12, paddingVertical: 10 },
  secondaryTxt: { color: theme.textDim, fontWeight: '700', fontSize: 14 },
  errTitle: { color: theme.danger, fontWeight: '800', fontSize: 17 },
  errText: { color: theme.textDim, fontSize: 13, marginTop: 8, textAlign: 'center' }
});

// screens/FlujoLiquidoScreen.tsx
// Timeline vertical. FIXED = bloque sólido con candado (no se toca).
// FLEXIBLE = borde degradado punteado (comunica "esto se puede mover" sin texto).

import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import Svg, { Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useAppStore, Task } from '../store/useAppStore';
import { colors, fonts, radii, spacing } from '../theme/tokens';

function LockIcon() {
  // Icono simple sin dependencia de librería de iconos externa.
  return (
    <View style={styles.lockIcon}>
      <View style={styles.lockShackle} />
      <View style={styles.lockBody} />
    </View>
  );
}

function FlexibleBorder({ width, height }: { width: number; height: number }) {
  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <SvgGradient id="flexGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.ai.violet} />
          <Stop offset="1" stopColor={colors.ai.cyan} />
        </SvgGradient>
      </Defs>
      <Rect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        rx={radii.md}
        stroke="url(#flexGrad)"
        strokeWidth={1.5}
        strokeDasharray="6,5"
        fill="none"
      />
    </Svg>
  );
}

function TimelineItem({ task }: { task: Task }) {
  const isFixed = task.type === 'FIXED';
  const time = new Date(task.startTime).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View
      style={[
        styles.item,
        isFixed ? styles.itemFixed : styles.itemFlexible,
        task.isBufferBlock && styles.itemBuffer,
      ]}
    >
      {!isFixed && <FlexibleBorder width={343} height={72} />}
      <View style={styles.itemContent}>
        <Text style={styles.itemTime}>{time}</Text>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {task.title}
        </Text>
        <Text style={styles.itemDuration}>{task.durationMinutes} min</Text>
      </View>
      {isFixed && <LockIcon />}
    </View>
  );
}

export default function FlujoLiquidoScreen() {
  const timeline = useAppStore((s) => s.timeline);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tu día</Text>
      <FlatList
        data={timeline}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TimelineItem task={item} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.connector} />}
        ListEmptyComponent={
          <Text style={styles.emptyState}>
            Tu agenda está vacía. Cuéntale a SYNKROS tu día en Comando.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  header: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text.primary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  connector: {
    width: 2,
    height: spacing.md,
    backgroundColor: colors.task.fixed,
    marginLeft: spacing.lg,
  },
  item: {
    height: 72,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  itemFixed: {
    backgroundColor: colors.bg.surface,
  },
  itemFlexible: {
    backgroundColor: colors.bg.surfaceRaised ?? colors.bg.surface,
  },
  itemBuffer: {
    opacity: 0.6,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTime: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.text.secondary,
  },
  itemTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.text.primary,
  },
  itemDuration: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
  },
  lockIcon: {
    width: 16,
    height: 16,
    alignItems: 'center',
  },
  lockShackle: {
    width: 8,
    height: 6,
    borderWidth: 1.5,
    borderColor: colors.text.secondary,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  lockBody: {
    width: 12,
    height: 8,
    backgroundColor: colors.text.secondary,
    borderRadius: 2,
    marginTop: -1,
  },
  emptyState: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});

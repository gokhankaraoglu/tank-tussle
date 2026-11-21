import type { WeaponId } from '@tank-tussle/game-core'
import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import { WEAPON_ICONS } from '../platform/weapon-icons'
import { colors } from '../theme'

export const WeaponIcon = ({ id, size }: { readonly id: WeaponId; readonly size: number }) => {
  const source = WEAPON_ICONS[id]
  if (source === undefined) return <View style={{ width: size, height: size }} />
  return <Image source={source} style={{ width: size, height: size }} contentFit="contain" />
}

export const WeaponTraits = ({ traits }: { readonly traits: readonly string[] }) => (
  <View style={styles.traits}>
    {traits.map((trait) => (
      <Text key={trait} style={styles.trait}>
        {trait}
      </Text>
    ))}
  </View>
)

const styles = StyleSheet.create({
  traits: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  trait: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.secondary,
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
    overflow: 'hidden',
  },
})

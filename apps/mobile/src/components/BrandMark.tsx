import { Image, StyleSheet, View } from 'react-native'

const mark = require('../../assets/logos/logo-mark.webp')
const wordmark = require('../../assets/logos/logo-wordmark.png')

export function BrandMark({ size = 88 }: { size?: number }) {
  return (
    <View style={styles.wrap}>
      <Image source={mark} style={{ width: size, height: size }} resizeMode="contain" />
      <Image source={wordmark} style={styles.word} resizeMode="contain" />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', alignSelf: 'center', gap: 10 },
  word: { width: 220, height: 36 },
})

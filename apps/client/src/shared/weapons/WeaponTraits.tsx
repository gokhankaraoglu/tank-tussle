import styles from './weapon-traits.module.css'

/** Badges for what makes a weapon special ("Homing", "Steals points"…). */
export const WeaponTraits = ({ traits }: { readonly traits: readonly string[] }) => (
  <span className={styles.traits}>
    {traits.map((trait) => (
      <span key={trait} className={styles.trait}>
        {trait}
      </span>
    ))}
  </span>
)

// the styles for this gradient grid background is heavily inspired by
// Paco & Rauno's amazing CMDK site (https://cmdk.paco.me) – all credits go to them!
import styles from "./background.module.css";

export default function Background() {
  return (
    <div className={styles.main}>
      <div className={styles.content} />
    </div>
  );
}

// the styles for this gradient grid background is
// inspired by Paco & Rauno's amazing CMDK site (https://cmdk.paco.me)
import styles from "./background.module.css";

export default function Background() {
  return (
    <div className={styles.main}>
      <div className={styles.content} />
    </div>
  );
}

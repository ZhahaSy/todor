// notice 组件

const Notice = ({ message }: { message: string }) => {
  return (
    <div className={styles.notice}>
      {message}
    </div>
  );
};
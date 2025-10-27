// interface
interface IDebugUtil {
  text: string;
  value: unknown;
  isActiveOnProd?: boolean;
}

// debug
export const debugUtil = (props: IDebugUtil) => {
  const { text, value, isActiveOnProd = false } = props;

  if (
    !process.env.NEXT_PUBLIC_DISABLE_DEBUGGER &&
    (process.env.NODE_ENV !== "production" || isActiveOnProd)
  ) {
    // eslint-disable-next-line no-console
    console.log(`Debug [${text}]: ${JSON.stringify(value, null, 2)}`);
  }
};

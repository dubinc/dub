export function prettyPrint(value: any, indent = 2) {
  console.log(
    JSON.stringify(
      value,
      (_key, val) => {
        if (val instanceof Set) return { __type: "Set", values: [...val] };
        if (val instanceof Map)
          return { __type: "Map", entries: [...val.entries()] };
        if (val instanceof Date) return val.toISOString();
        if (val instanceof Error)
          return { __type: "Error", message: val.message, stack: val.stack };
        return val;
      },
      indent,
    ),
  );
}

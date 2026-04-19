export function getClassProperties<T>(obj: T extends {} ? T : never): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}
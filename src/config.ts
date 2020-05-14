export interface Config {
  debug: boolean;
  showEnvs: boolean;
  showNormalization: boolean;
  verify: boolean;
}
export const config: Config = {
  debug: false,
  showEnvs: false,
  showNormalization: true,
  verify: false,
};
export const setConfig = (c: Partial<Config>) => {
  for (let k in c) (config as any)[k] = (c as any)[k];
};

export const log = (msg: () => any) => {
  if (config.debug) console.log(msg());
};

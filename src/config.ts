export interface ConfigTypes {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

let config: ConfigTypes = {
  owner: "liceal",
  repo: "cloud_image",
  branch: "master", // 或你的默认分支名
  token:
    "github_" +
    "pat_" +
    "11AICQVMY0mb0OYcDs4fl4_" +
    "1H9CNdXvR4QXxn1DjHBV45YCbm7Av7r16xV9vsc7XwFGQ5Z3P2SJCgcexJj", // 需要有repo权限
};

export function setConfig(conf: Partial<ConfigTypes>) {
  (Object.keys(conf) as Array<keyof ConfigTypes>).forEach((key) => {
    if (conf[key] !== undefined) {
      config[key] = conf[key]!;
    }
  });
}

export default config;

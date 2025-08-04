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
    "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", // 需要有repo权限
};

export function setConfig(conf: Partial<ConfigTypes>) {
  (Object.keys(conf) as Array<keyof ConfigTypes>).forEach((key) => {
    if (conf[key] !== undefined) {
      config[key] = conf[key]!;
    }
  });
}

export default config;

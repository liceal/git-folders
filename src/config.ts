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

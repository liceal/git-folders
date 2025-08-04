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

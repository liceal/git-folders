import axios from "axios";
import { addDateToFileAdvanced } from "./utils";
import config from "./config";

/**
 * 获取树形数据
 * @returns
 */
export async function getTreeFiles(
  sha?: string,
  recursive?: 1,
  cache?: true
): Promise<FileTree> {
  let url = new URL(
    `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${
      sha || config.branch
    }`
  );
  if (recursive) {
    url.searchParams.append("recursive", recursive.toString());
  }
  if (!cache) {
    url.searchParams.append("_time", new Date().getTime().toString());
  }

  const res = await axios({
    url: url.toString(),
    method: "GET",
    headers: {
      Authorization: `token ${config.token}`,
      "Content-Type": "application/json",
    },
  });

  return res.data;
}

/**
 * 上传文件到GitHub仓库
 * @param files 文件列表 test.png
 * @param path 目录位置（空字符串表示根目录）
 */
export async function uploadFile(
  files: FileList,
  path: string
): Promise<FileTreeItem[]> {
  let ps: Promise<{
    data: {
      content: {
        download_url: string;
        git_url: string;
        html_url: string;
        name: string;
        path: string;
        sha: string;
        size: string;
        type: string;
        url: string;
      };
    };
  }>[] = [];
  // const normalizedPath = path
  //   ? path.replace(/^\//, "").replace(/\/$/, "") // 去除前后多余的斜杠
  //   : "";
  const _path = path ? `${path}/` : "";
  let baseUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${_path}`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (file.size > 100 * 1024 * 1024) {
      throw new Error(`文件 ${file.name} 大小超过100MB`);
    }

    // 处理成新名字
    const fileName = addDateToFileAdvanced(file.name, i || "");
    const content = await readFileAsBase64(file);
    ps.push(
      axios({
        url: `${baseUrl}${fileName}`,
        method: "PUT",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        data: {
          message: `upload ${fileName}`,
          content,
          branch: config.branch,
        },
      })
    );
  }

  let res = await Promise.all(ps);

  console.log(res);

  return res.map((v) => ({
    name: v.data.content.name,
    path: v.data.content.path,
    sha: v.data.content.sha,
    type: "blob",
    previewUrl: v.data.content.download_url,
    url: v.data.content.url,
  }));
}

// 辅助函数：将文件读取为Base64
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // 将ArrayBuffer转为Base64
      const bytes = new Uint8Array(reader.result as ArrayBuffer);
      let binary = "";
      bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
      resolve(btoa(binary));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 删除GitHub仓库中的文件
 * @param {string} owner - 仓库所有者
 * @param {string} repo - 仓库名称
 * @param {string} path - 文件路径（如 'docs/README.md'）
 * @param {string} token - GitHub个人访问令牌
 * @param {string} [branch='main'] - 分支名，默认为'main'
 * @returns {Promise<Object>} API响应
 */
export async function deleteFile(file: FileTreeItem) {
  return axios({
    url: `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${file.path}`,
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "User-Agent": "GitHub-File-Delete-Script",
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
    data: {
      message: `Delete ${file.path}`, // 提交信息
      sha: file.sha, // 必须提供的文件SHA值
      branch: config.branch, // 可选，指定分支
    },
  });
}

/**
 * 获取文件夹下的文件，这种方式获取数据没有缓存会是最新的
 * @param path 文件夹路径
 * @returns
 */
export async function getPathFiles(path: string): Promise<FileTreeItem[]> {
  const url = `https://api.github.com/repos/liceal/cloud_image/contents/${path}?_time=
  ${new Date().getTime().toString()}`;

  const res = await axios({
    url,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
  });

  // 转换成FileTreeItem
  const resData = res.data as FileContent[];

  const fileTreeItems = resData.map((file) => ({
    name: file.name,
    path: file.path,
    type: { dir: "tree", file: "blob" }[file.type],
    size: file.size,
    url: file.url,
    sha: file.sha,
  })) as FileTreeItem[];

  return fileTreeItems;
}

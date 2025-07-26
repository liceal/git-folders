import { addDateToFileAdvanced, getCurrentDate } from "./utils";

const owner = "liceal";
const repo = "cloud_image";
const branch = "master"; // 或你的默认分支名
const token =
  "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"; // 需要有repo权限

// export async function getFiles(): Promise<FileInfo[]> {
//   const url = `https://api.github.com/repos/${owner}/${repo}/contents`;
//   const res = await fetch(url, {
//     method: "GET",
//     headers: {
//       Authorization: `token ${token}`,
//       "Content-Type": "application/json",
//     },
//   });

//   if (!res.ok) {
//     throw new Error(`GitHub API error: ${res.status}`);
//   }

//   const data = await res.json();

//   return data;
// }

// export async function getTreeFiles(_url?: string): Promise<FileTree> {
//   const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
//   const res = await fetch(url, {
//     method: "GET",
//     headers: {
//       Authorization: `token ${token}`,
//       "Content-Type": "application/json",
//     },
//   });

//   if (!res.ok) {
//     throw new Error(`GitHub API error: ${res.status}`);
//   }

//   const data = await res.json();

//   return data;
// }

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
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha || branch}`
  );
  if (recursive) {
    url.searchParams.append("recursive", recursive.toString());
  }
  if (!cache) {
    url.searchParams.append("_time", new Date().getTime().toString());
  }
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const data = await res.json();

  return data;
}

/**
 * 上传文件到GitHub仓库
 * @param files 文件列表
 * @param path 目录位置（空字符串表示根目录）
 */
export async function uploadFile(
  file: File,
  path: string
): Promise<{ status: number; data: any; fileName: string }> {
  // 处理路径格式（确保不以/开头、空路径转为根目录）
  const normalizedPath = path
    ? path.replace(/^\//, "").replace(/\/$/, "") // 去除前后多余的斜杠
    : "";

  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${
    normalizedPath ? `${normalizedPath}/` : ""
  }`;

  try {
    let fileName = addDateToFileAdvanced(file.name);

    // 检查文件大小限制（GitHub限制单文件≤100MB）
    if (file.size > 100 * 1024 * 1024) {
      throw new Error(`文件 ${file.name} 超过100MB限制`);
    }

    // 读取文件内容为Base64
    const content = await readFileAsBase64(file);

    // 构建文件路径（处理空目录情况）
    // const filePath = normalizedPath
    //   ? `${normalizedPath}/${file.name}`
    //   : file.name;

    const response = await fetch(`${baseUrl}${fileName}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        message: fileName,
        content: content,
        branch: branch,
      }),
    });

    const data = await response.json();

    return {
      status: response.status,
      data: data,
      fileName: file.name,
    };
  } catch (error: any) {
    console.error(`上传文件 ${file.name} 失败:`, error);
    return {
      status: error.response?.status || 500,
      data: { error: error.message },
      fileName: file.name,
    };
  }
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
  const deleteUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`;

  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "GitHub-File-Delete-Script",
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
    body: JSON.stringify({
      message: `Delete ${file.path}`, // 提交信息
      sha: file.sha, // 必须提供的文件SHA值
      branch: branch, // 可选，指定分支
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`删除失败: ${errorData.message || response.statusText}`);
  }

  return await response.json();
}

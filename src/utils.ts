import { getTreeFiles } from "./api";
import config, { setConfig } from "./config";

/*
  把完整树转成连表关系 顶级path是分支名称 如 master
  获取完整树 用作缓存
  {
    path:{
      prePath:'',
      ...
    },
    ...
  }
*/
export async function initFilesTree(): Promise<LinkTree> {
  const res = await getTreeFiles(config.branch, 1);
  // const branchToFolder = config.branch;

  let linkTree: LinkTree = {};

  let pathToFile: { [path: string]: { sha: string; url: string } } = {
    "": res, //跟目录是当前分支
  };

  res.tree.forEach((file) => {
    pathToFile[file.path] = file;
  });

  // 转成树结构
  res.tree.forEach((file) => {
    // 文件拆成连部分 文件夹和文件名
    let paths = file.path.split("/");
    let folderPath = paths.slice(0, -1).join("/");
    let fileName = paths[paths.length - 1];
    file.name = fileName;

    // 异常处理
    if (!pathToFile[folderPath]) {
      console.log(folderPath, "不存在 请检查");
      return;
    }

    // 生成文件夹
    if (!linkTree[folderPath]) {
      // 初始化文件夹
      linkTree[folderPath] = {
        // 文件夹信息
        sha: pathToFile[folderPath].sha,
        url: pathToFile[folderPath].url,
        // 文件夹下的文件或者文件夹
        tree: [file],
      };
    } else {
      // 插入文件
      linkTree[folderPath].tree.push(file);
    }

    // 如果是文件 则单独生成一份
    // if (file.type === "blob") {
    //   linkTree[file.path] = {
    //     sha: file.sha,
    //     url: file.url,
    //     tree: [],
    //     type: file.type,
    //   };
    // }
  });
  console.log("linkTree", linkTree);

  return linkTree;
}

// 生成当前时间
export function getCurrentDate() {
  return new Date().toISOString();
}

// 文件名加上当前容器
export function addDateToFileAdvanced(
  fileName: string,
  appendStr: string | number
) {
  // 处理文件名部分
  const lastDotIndex = fileName.lastIndexOf(".");
  const baseName =
    lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : "";
  const names = [baseName, getCurrentDate()];

  if (appendStr) {
    names.push(String(appendStr));
  }

  return `${names.join("-")}${extension}`;
}

export function getImgUrl(file: FileTreeItem) {
  return `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${file.path}`;
}

export async function getAllImage(): Promise<FileTreeItem[]> {
  const res = await getTreeFiles(config.branch, 1);

  // 支持的图片扩展名
  const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"];

  // 过滤出图片文件并处理
  const images = res.tree
    .filter((item) => item.type === "blob") // 只处理文件
    .filter((item) => {
      // 检查是否是图片文件
      const extension = item.path
        .toLowerCase()
        .substring(item.path.lastIndexOf("."));
      return imageExtensions.includes(extension);
    })
    .map((item) => {
      // 从path中提取文件名
      const fullPath = item.path;
      const lastSlashIndex = fullPath.lastIndexOf("/");
      const fileName =
        lastSlashIndex === -1
          ? fullPath
          : fullPath.substring(lastSlashIndex + 1);

      // 构造返回对象
      return {
        ...item,
        name: fileName,
        path: fullPath,
        previewUrl: getImgUrl(item),
      };
    });

  return images;
}

export function syncChromeConfig(callback: () => void) {
  if (chrome.storage?.sync) {
    chrome.storage.sync.get(["config"], (res) => {
      if (res.config) {
        setConfig(res.config);
      }
      callback();
    });
  } else {
    callback();
  }
}

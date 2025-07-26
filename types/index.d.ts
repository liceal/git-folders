interface FileInfo {
  download_url: string;
  git_url: string;
  html_url: string;
  name: string;
  path: string;
  sha: string;
  size: number;
  type: string;
  url: string;
}

interface FileTreeItem {
  path: string;
  mode: "100644" | "100755" | "040000" | "16000" | "12000"; //文件模式；100644文件 (blob)、100755可执行文件 (blob)、040000子目录 (tree)、160000子模块 (commit) 或120000指定符号链接路径的 blob 之一。
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
  name: string;
}

interface FileTree {
  sha: string;
  tree: FileTreeItem[];
  url: string;
  type?: "tree" | "blob";
}

interface LinkTree {
  [folder_path: string]: FileTree;
}

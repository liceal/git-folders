declare module "*.scss" {
  const content: Record<string, string>;
  export default content;
}

interface FileContent {
  download_url: string;
  git_url: string;
  html_url: string;
  name: string;
  path: string;
  sha: string;
  size: number;
  type: string;
  url: string;
  _link: {
    self: string;
    git: string;
    html: string;
  };
}

interface FileTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
  name: string;
  previewUrl?: string;
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

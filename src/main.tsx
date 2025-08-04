import "virtual:uno.css";
import m from "mithril";
import { deleteFile, getPathFiles, getTreeFiles, uploadFile } from "./api";
import { getAllImage, initFilesTree } from "./utils";
import config, { ConfigTypes, setConfig } from "./config";
import styles from "./css.module.scss";

let historyPaths: string[] = [""];
let currentPathindex = 0;
let nowPath = "";
let isLoading = false;
function getCurrentPath() {
  return historyPaths[currentPathindex];
}
function getImgUrl(file: FileTreeItem) {
  return `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${file.path}`;
}
let linkTree: LinkTree = {};
let files: FileTree | undefined = undefined;

let isSetting = false; //是否设置页面
let isPreviewImg = false; //是否预览所有图片

let AppRef: App;

class FilesContainer implements m.Component {
  // public files: FileTree | undefined = undefined;

  private async initFiles() {
    // const res = await getTreeFiles(dirPaths[dirPaths.length - 1]);
    // files = res;
    // m.redraw();

    nowPath = getCurrentPath();
    files = linkTree[nowPath];
    console.log("init files", files, linkTree);
    m.redraw();
  }

  private openDir = (file: FileTreeItem) => {
    if (currentPathindex < historyPaths.length - 1) {
      historyPaths = historyPaths.slice(0, currentPathindex + 1);
    }
    historyPaths.push(file.path);
    currentPathindex = historyPaths.length - 1;
    this.initFiles();
  };

  private openPath = (path: string) => {
    if (!linkTree[path]) {
      alert("路径不存在");
      return;
    }
    // 如果和之前的路径重复则不插入
    if (historyPaths[historyPaths.length - 1] === path) return;
    historyPaths.push(path);
    currentPathindex = historyPaths.length - 1;
    this.initFiles();
  };

  private onDel = (file: FileTreeItem, key: number, e: Event) => {
    const target = e.target as HTMLElement;
    const fileBlock = target.closest("#file_block");

    console.log(target.closest("#file_block"));

    if (!fileBlock) return; // 确保 parent 存在

    // 1. 添加红色边框（Unocss 类名）
    fileBlock.classList.add(
      "border",
      "outline-red",
      "outline-solid",
      "pointer-events-none"
    );

    // 删除前记录文件夹指针位置 避免在删除过程中切换文件夹
    let _files = files;

    deleteFile(file)
      .then((res) => {
        delete _files?.tree[key];
        m.redraw();
      })
      .catch((res) => {
        alert("删除失败请重试");
      });
  };

  private showAddFolderDialog() {
    const dialog = document.querySelector("#dialog") as HTMLDialogElement;
    if (dialog) {
      dialog.showModal();
      m.render(
        dialog,
        <div onclick={(e: Event) => e.stopPropagation()}>
          <div>创建文件夹</div>
          <input
            placeholder="文件夹名称"
            autofocus
            class="px-2 py-1"
            oncreate={(vnode: m.VnodeDOM) => {
              // 在元素创建后手动调用 focus()
              (vnode.dom as HTMLInputElement).focus();
            }}
            onkeypress={(e: KeyboardEvent & { target: HTMLInputElement }) => {
              if (e.key === "NumpadEnter" || e.key === "Enter") {
                let folderName = e.target.value;
                e.target.value = "";
                // 当前位置增加文件夹
                linkTree[getCurrentPath()].tree.push({
                  name: folderName,
                  path: `${getCurrentPath()}/${folderName}`,
                  sha: "",
                  type: "tree",
                  url: "",
                });
                linkTree[`${getCurrentPath()}/${folderName}`] = {
                  sha: "",
                  tree: [],
                  url: "",
                  type: "tree",
                };
                console.log(linkTree);
                m.redraw();
                dialog.close();
              }
            }}
          />
        </div>
      );
    }
  }

  private prev = () => {
    currentPathindex--;
    this.initFiles();
  };

  private next = () => {
    currentPathindex++;
    this.initFiles();
  };

  private inputPress = (e: KeyboardEvent & { target: HTMLInputElement }) => {
    if (e.key === "NumpadEnter" || e.key === "Enter") {
      let path = e.target.value;
      // 进入文件夹
      this.openPath(path);
    }
  };

  private back = () => {
    let path = getCurrentPath().split("/").slice(0, -1).join("/");
    historyPaths.push(path);
    currentPathindex = historyPaths.length - 1;
    this.initFiles();
  };

  private reload = async () => {
    isLoading = true;
    console.log(files);
    // 后台更新树分支
    const res = await getPathFiles(getCurrentPath());
    linkTree[getCurrentPath()].tree = res;
    isLoading = false;
    m.redraw();
    console.log(linkTree, getCurrentPath());
  };

  private pathSplitClick(index: number) {
    let newPaths = nowPath
      .split("/")
      .slice(0, index + 1)
      .join("/");
    this.openPath(newPaths);
  }

  private getBrotherFiles(index: number): FileTreeItem[] {
    let parentPath = nowPath.split("/").slice(0, index).join("/");

    return linkTree[parentPath].tree;
  }

  async oninit() {
    linkTree = await initFilesTree();
    this.initFiles();
  }

  view() {
    const renderContent = () => {
      if (!config.branch || !config.owner || !config.repo || !config.token) {
        let dom = [];
        if (!config.owner) dom.push(<div>请设置用户名</div>);
        if (!config.repo) dom.push(<div>请设置仓库名称</div>);
        if (!config.branch) dom.push(<div>请设置分支</div>);
        if (!config.token) dom.push(<div>请设置token</div>);
        return dom;
      }

      if (!files) {
        return <div>正在请求</div>;
      }

      return [
        <div class="flex items-center">
          <button disabled={currentPathindex === 0} onclick={this.prev}>
            <div class="i-mdi:chevron-left" />
          </button>
          <button
            disabled={currentPathindex === historyPaths.length - 1}
            onclick={this.next}
          >
            <div class="i-mdi:chevron-right" />
          </button>
          <button disabled={!getCurrentPath()} onclick={this.back}>
            <div class="i-mdi:chevron-up" />
          </button>

          <input
            type="text"
            id="folderPath"
            list="folderOptions"
            placeholder="请输入文件夹路径"
            autocomplete="off"
            class="text-left flex-1"
            onkeypress={this.inputPress}
            value={nowPath}
            oninput={(e: Event & { target: { value: string } }) =>
              (nowPath = e.target.value)
            }
          />
          <datalist id="folderOptions">
            {Object.keys(linkTree).map((path) => {
              return <option value={path}></option>;
            })}
          </datalist>

          <div
            class={`
              cursor-pointer
              float-end
              ${isLoading ? "i-mdi:loading animate-spin" : "i-mdi:reload"}
              `}
            onclick={this.reload}
          />
        </div>,

        <div class="flex">
          <div
            class="mx-1 bg-gray-1 cursor-pointer"
            onclick={() => this.pathSplitClick(-1)}
          >
            根目录
          </div>

          {nowPath &&
            nowPath.split("/").map((path, index) => {
              return (
                <div
                  class="mx-1 bg-gray-1 cursor-pointer relative group"
                  onclick={() => this.pathSplitClick(index)}
                >
                  {path}
                  <div class="absolute z-10 bg-gray hidden group-hover:block">
                    {this.getBrotherFiles(index).map((file) => {
                      if (file.type === "tree") {
                        return (
                          <div
                            class="cursor-pointer hover:text-red"
                            onclick={() => this.openPath(file.path)}
                          >
                            {file.name}
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })}

          <button onclick={this.showAddFolderDialog}>
            <div class="i-mdi:folder-plus text-green text-xl" />
          </button>
        </div>,

        <div class="flex gap-2 flex-wrap">
          {files.tree.length > 0 ? (
            files.tree.map((file, key) => {
              if (file.type === "blob") {
                return (
                  <div id="file_block" class=" shadow-sm shadow-gray w-70px">
                    <img
                      title={file.name}
                      src={getImgUrl(file)}
                      alt={file.name}
                      class="w-70px h-70px object-cover cursor-pointer select-none no-drag"
                      onclick={() => {
                        AppRef.openImg(getImgUrl(file));
                      }}
                    />

                    {/* 操作 */}
                    <div class="flex">
                      <div
                        class="i-mdi:delete-circle-outline text-size-2xl text-red cursor-pointer"
                        onclick={(e: Event) => this.onDel(file, key, e)}
                      />
                      <a
                        href={getImgUrl(file)}
                        class="i-mdi:eye-circle-outline text-size-2xl text-red cursor-pointer"
                        target="_blank"
                      />
                    </div>

                    <span
                      class="text-sm overflow-auto whitespace-nowrap flex scrollbar-none"
                      title={file.name}
                    >
                      {file.name}
                    </span>
                  </div>
                );
              } else if (file.type === "tree") {
                // 文件夹
                return (
                  <div class="shadow-sm shadow-gray w-70px">
                    <div
                      class="i-mdi:folder  object-cover cursor-pointer bg-blue-4 w-70px h-70px"
                      onclick={() => this.openDir(file)}
                    />
                    <span class="line-clamp-1 text-sm" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                );
              }
            })
          ) : (
            <div class="flex items-center justify-center text-2xl text-gray h-100px w-full">
              <span class="i-mdi:folder-hidden" /> 空文件夹
            </div>
          )}
        </div>,
      ];
    };

    return (
      <div id="main" class="w-304px relative">
        <div>
          <button onclick={() => (isSetting = true)}>设置</button>
          <button onclick={() => (isPreviewImg = true)}>预览所有图片</button>
        </div>
        {renderContent()}
      </div>
    );
  }
}

class Upload implements m.Component {
  private isDragging = false;
  private isUploading = false;

  oncreate() {
    document.addEventListener("dragover", (e) => {
      e.preventDefault();
      let target = e.target as HTMLElement;

      if (target.closest("#main") !== null) {
        this.isDragging = true;
        m.redraw();
      }
    });
    document.addEventListener("dragleave", (e) => {
      e.preventDefault();
      let target = e.target as HTMLElement;
      if (target.closest("#upload") !== null) {
        this.isDragging = false;
        m.redraw();
      }
    });

    document.addEventListener("drop", async (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files) {
        let fs = e.dataTransfer.files;

        this.isUploading = true;
        m.redraw();

        uploadFile(fs, getCurrentPath())
          .then((newFiles) => {
            files?.tree.splice(files.tree.length, 0, ...newFiles);

            console.log(files);

            this.isUploading = false;
            this.isDragging = false;
            m.redraw();
          })
          .catch((e) => {
            console.error(e);
            this.isUploading = false;
            this.isDragging = false;
            alert("上传错误");
          });
      }
    });
  }
  view() {
    if (this.isDragging) {
      return (
        <div
          id="upload"
          class="absolute top-0 left-0 w-full h-full bg-gray-1 bg-op-50 flex justify-center items-center"
        >
          <div
            class={[
              "w-90% h-90% flex items-center justify-center border-dashed rounded-lg  backdrop-blur-sm pointer-events-none",
              this.isUploading
                ? "border-green-500 text-green-500"
                : "border-blue-500 text-blue-500",
            ].join(" ")}
          >
            <div class="i-mdi:cloud-upload text-5xl"></div>
            {this.isUploading ? (
              <div class="text-2xl font-medium">正在上传</div>
            ) : (
              <div class="text-2xl font-medium">拖拽文件到此处</div>
            )}
          </div>
        </div>
      );
    }
  }
}

class PreviewImg implements m.Component {
  private images = [] as FileTreeItem[];

  private columnCount = 4;
  async oncreate(vnode: m.VnodeDOM) {
    this.images = await getAllImage();
    console.log(this.images);
    m.redraw();
    const previewImg = document.getElementById("previewImg");
    if (previewImg) {
      previewImg.addEventListener("wheel", (e: WheelEvent) => {
        const box1 = previewImg.firstChild as HTMLElement;

        e.preventDefault(); // 阻止默认滚动行为

        let currentMargin = parseInt(window.getComputedStyle(box1).marginTop);
        if (e.ctrlKey) {
          if (e.deltaY > 0) {
            // console.log("小");
            this.columnCount++;
          } else {
            // console.log("大");
            if (this.columnCount > 1) {
              this.columnCount--;
            }
          }
          m.redraw();
          return;
        }

        if (e.deltaY > 0) {
          // 向下滚动
          if (currentMargin < 300) {
            box1.style.marginTop = currentMargin + e.deltaY + "px";
          }
        } else if (e.deltaY < 0) {
          if (currentMargin > -1100) {
            box1.style.marginTop = currentMargin + e.deltaY + "px";
          }
        }

        // console.log("当前margin-top:", box1.style.marginTop);
      });
    }
  }
  view() {
    return [
      <button onclick={() => (isPreviewImg = false)}>返回</button>,
      <div
        id="previewImg"
        className={[styles.container, "bg-gray-1"].join(" ")}
        style={{ columnCount: this.columnCount }}
      >
        {this.images.map((file, index) => {
          // 动态设置 border-image 渐变的颜色线
          const step = 30; // 调整步长，控制颜色变化幅度
          const saturation = 90; // 饱和度更高，颜色更鲜艳（80~100%）
          const lightness = 50; // 亮度适中，避免过亮或过暗（40~60%）

          const borderImageStyle = `linear-gradient(
            to bottom,
            hsl(${index * step}, ${saturation}%, ${lightness}%),
            hsl(${(index + 1) * step}, ${saturation}%, ${lightness}%)
          ) 1`;

          return (
            <div
              key={index}
              className={`${styles.box} cursor-pointer`}
              style={{
                backgroundImage: `url(${file.previewUrl})`,
                borderImage: borderImageStyle,
                borderLeft: "3px dotted gray",
                borderRight: "3px dotted gray",
              }}
              onclick={() => AppRef.openImg(file.previewUrl as string)}
            ></div>
          );
        })}
      </div>,
    ];
  }
}

class Setting implements m.Component {
  private myConfig = {
    owner: "",
    repo: "",
    branch: "",
    token: "",
  };
  private save = () => {
    setConfig(this.myConfig);
    chrome.storage.sync.set({ config: config }, () => {
      console.log("存储 liceal", config);
    });
    isSetting = false;
  };
  oninit(vnode: m.Vnode<{}, m._NoLifecycle<this & {}>>) {
    try {
      this.myConfig = { ...config };
      m.redraw();
      chrome.storage.sync.get(["config"], (res) => {
        console.log("config配置", res);
        this.myConfig = { ...config, ...res.config };
        setConfig(this.myConfig);
        m.redraw();
      });
    } catch (e) {
      console.error(e);
    }
  }
  view() {
    return (
      <div>
        <div>
          用户名
          <input
            value={this.myConfig.owner}
            oninput={(e: Event & { target: { value: string } }) =>
              (this.myConfig.owner = e.target.value)
            }
          />
        </div>
        <div>
          仓库名称
          <input
            value={this.myConfig.repo}
            oninput={(e: Event & { target: { value: string } }) =>
              (this.myConfig.repo = e.target.value)
            }
          />
        </div>
        <div>
          分支
          <input
            value={this.myConfig.branch}
            oninput={(e: Event & { target: { value: string } }) =>
              (this.myConfig.branch = e.target.value)
            }
          />
        </div>
        <div>
          token
          <input
            value={this.myConfig.token}
            oninput={(e: Event & { target: { value: string } }) =>
              (this.myConfig.token = e.target.value)
            }
          />
        </div>
        <button onclick={this.save}>保存</button>
        <button onclick={() => (isSetting = false)}>返回</button>
      </div>
    );
  }
}
class App implements m.Component {
  public openImg = (url: string) => {
    console.log("打开图片");

    const dialog = document.querySelector("#dialog") as HTMLDialogElement;
    if (dialog) {
      dialog.showModal();
      m.render(
        dialog,
        <img
          src={url}
          class="max-w-80vw max-h-80vh object-contain select-none no-drag"
          onclick={(e: Event) => e.stopPropagation()}
        />
      );
    }
  };

  oninit(vnode: m.Vnode) {
    AppRef = vnode.state as App;

    // 获取最新config
    try {
      chrome.storage.sync.get(["config"], (res) => {
        console.log("config配置", res);
        if (res.config) {
          setConfig(res.config);
          m.redraw();
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  view() {
    let Content: any;
    if (isSetting) {
      Content = <Setting />;
    } else if (isPreviewImg) {
      Content = <PreviewImg />;
    } else {
      Content = [<FilesContainer />, <Upload />];
    }

    return [
      Content,
      <dialog
        id="dialog"
        onclick={function (this: HTMLDialogElement) {
          this.close();
        }}
      />,
    ];
  }
}

m.mount(document.body, App);

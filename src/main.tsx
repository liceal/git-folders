import "virtual:uno.css";
import m from "mithril";
import { deleteFile, getTreeFiles, uploadFile } from "./api";
import { initFilesTree } from "./utils";
import config from "./config";

let historyPaths: string[] = [""];
let currentPathindex = 0;
let nowPath = "";
let isLoading = false;
function getCurrentPath() {
  return historyPaths[currentPathindex];
}
function getImgUrl(file: FileTreeItem) {
  // let filePath;
  // if (getCurrentPath()) {
  //   filePath = `${getCurrentPath()}/${imgName}`;
  // } else {
  //   filePath = imgName;
  // }

  return `https://raw.githubusercontent.com/liceal/cloud_image/${config.branch}/${file.path}`;
}
let linkTree: LinkTree = {};
let files: FileTree | undefined = undefined;

class FilesContainer implements m.Component {
  // public files: FileTree | undefined = undefined;

  public async initFiles() {
    // const res = await getTreeFiles(dirPaths[dirPaths.length - 1]);
    // files = res;
    // m.redraw();

    nowPath = getCurrentPath();
    files = linkTree[nowPath];
    console.log("init files", files, linkTree);
    m.redraw();
  }

  private openImg = (url: string) => {
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

  private openDir = (file: FileTreeItem) => {
    if (currentPathindex < historyPaths.length - 1) {
      historyPaths = historyPaths.slice(0, currentPathindex + 1);
    }
    historyPaths.push(file.path);
    currentPathindex = historyPaths.length - 1;
    this.initFiles();
  };

  public openPath = (path: string) => {
    if (!linkTree[path]) {
      alert("路径不存在");
      return;
    }
    historyPaths.push(path);
    currentPathindex = historyPaths.length - 1;
    this.initFiles();
  };

  private onDel = async (file: FileTreeItem, key: number, e: Event) => {
    (e.target as HTMLElement).classList.add("pointer-events-none bg-red-500");
    await deleteFile(file);
    console.log(files, key, e);
    delete files?.tree[key];
  };

  async oninit() {
    linkTree = await initFilesTree();
    this.initFiles();
  }

  view() {
    if (!files) {
      return <div>正在请求</div>;
    }
    return (
      <div class="flex gap-2 flex-wrap">
        {files.tree.map((file, key) => {
          if (file.type === "blob") {
            return (
              <div class=" shadow-sm shadow-gray w-70px">
                <img
                  title={file.name}
                  src={getImgUrl(file)}
                  alt={file.name}
                  class="w-70px h-70px object-cover cursor-pointer select-none no-drag"
                  onclick={() => {
                    this.openImg(getImgUrl(file));
                  }}
                />
                <div
                  class="i-mdi:delete-circle-outline text-size-2xl top-0 right-0 border-rounded-full text-red cursor-pointer"
                  onclick={(e: Event) => this.onDel(file, key, e)}
                />
                <span class="line-clamp-1 text-sm" title={file.name}>
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
        })}

        <dialog
          id="dialog"
          onclick={function (this: HTMLDialogElement) {
            this.close();
          }}
        />
      </div>
    );
  }
}

class Upload implements m.Component {
  private isDragging = false;

  oncreate() {
    document.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!this.isDragging) {
        this.isDragging = true;
        m.redraw();
      }
    });
    document.addEventListener("dragleave", (e) => {
      console.log(e.target);

      e.preventDefault();
      this.isDragging = false;
      m.redraw();
    });

    document.addEventListener("drop", async (e) => {
      e.preventDefault();
      this.isDragging = false;
      if (e.dataTransfer?.files) {
        console.log(e);

        // this.uploadedFiles = [
        //   ...this.uploadedFiles,
        //   ...Array.from(e.dataTransfer.files),
        // ];
        let fs = e.dataTransfer.files;

        if (fs.length > 1) {
          alert("一次只能上传一张图片，太多接口会报错");
          return;
        }

        let newFile = await uploadFile(fs[0], getCurrentPath());

        files?.tree.push({
          mode: "100644",
          path: newFile.data.content.path,
          sha: newFile.data.content.sha,
          size: newFile.data.content.size,
          type: "blob",
          url: newFile.data.content.url,
          name: newFile.data.content.name,
        });

        console.log(files);

        m.redraw();
      }
    });
  }
  view() {
    if (this.isDragging) {
      return (
        <div class="absolute top-0 left-0 w-full h-full bg-gray-1 bg-op-50 flex justify-center items-center">
          <div class="w-90% h-90% flex items-center justify-center border-dashed rounded-lg border-blue-500 text-blue-500 backdrop-blur-sm pointer-events-none">
            <div class="i-mdi:cloud-upload text-5xl"></div>
            <div class="text-2xl font-medium">拖拽文件到此处</div>
          </div>
        </div>
      );
    }
  }
}

class App implements m.Component {
  private filesContainerRef?: FilesContainer;

  public prev = () => {
    currentPathindex--;
    this.filesContainerRef?.initFiles();
  };

  public next = () => {
    currentPathindex++;
    this.filesContainerRef?.initFiles();
  };

  public back = () => {
    let path = getCurrentPath().split("/").slice(0, -1).join("/");
    historyPaths.push(path);
    currentPathindex = historyPaths.length - 1;
    this.filesContainerRef?.initFiles();
  };

  public reload = async () => {
    isLoading = true;
    console.log(files);
    // 后台更新树分支
    const res = await getTreeFiles(files?.sha);
    linkTree[getCurrentPath()] = res;
    isLoading = false;
  };

  private inputPress = (e: KeyboardEvent & { target: HTMLInputElement }) => {
    if (e.key === "NumpadEnter" || e.key === "Enter") {
      let path = e.target.value;
      // 进入文件夹
      this.filesContainerRef?.openPath(path);
    }
  };

  private pathSplitClick(index: number) {
    let newPaths = nowPath
      .split("/")
      .slice(0, index + 1)
      .join("/");
    this.filesContainerRef?.openPath(newPaths);
  }

  view() {
    return (
      <div class="p-4 w-304px relative">
        <div class="flex items-center">
          <div class="flex-1">
            <button disabled={currentPathindex === 0} onclick={this.prev}>
              <div class="i-mdi:chevron-left" />
            </button>
            <button
              disabled={currentPathindex === historyPaths.length - 1}
              onclick={this.next}
            >
              <div class="i-mdi:chevron-right" />
            </button>
            <button
              disabled={getCurrentPath().split("/").length === 1}
              onclick={this.back}
            >
              <div class="i-mdi:chevron-up" />
            </button>

            <input
              type="text"
              id="folderPath"
              list="folderOptions"
              placeholder="请输入文件夹路径"
              autocomplete="off"
              class="text-left w-full"
              onkeypress={this.inputPress}
              value={nowPath}
              oninput={(e: Event & { target: { value: string } }) =>
                (nowPath = e.target.value)
              }
            />
            {/* 输入框解析可点击 */}
            <div class="flex">
              <div
                class="mx-1 bg-gray-1 cursor-pointer"
                onclick={() => this.pathSplitClick(-1)}
              >
                根目录
              </div>
              {nowPath.split("/").map((path, index) => {
                return (
                  <div
                    class="mx-1 bg-gray-1 cursor-pointer"
                    onclick={() => this.pathSplitClick(index)}
                  >
                    {path}
                  </div>
                );
              })}
            </div>

            <datalist id="folderOptions">
              {Object.keys(linkTree).map((path) => {
                return <option value={path}></option>;
              })}
            </datalist>
          </div>
          <div
            class={`
              cursor-pointer
              float-end
              ${isLoading ? "i-mdi:loading animate-spin" : "i-mdi:reload"}
              `}
            onclick={this.reload}
          ></div>
        </div>

        <FilesContainer
          oninit={(vnode) => {
            this.filesContainerRef = vnode.state as FilesContainer;
          }}
        />

        <Upload />
      </div>
    );
  }
}

m.mount(document.body, App);

import { Fragment, useEffect, useState } from "react";
import { Slide, toast, ToastContainer } from "react-toastify";
import { useAtom } from "jotai";
import { Project, Commits, Selected } from "./store";
import { DiffViewer } from "./DiffViewer";
import { parseDiff } from "./utils/diffParser";
import { DiffFile } from "./types";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  const [project, setProject] = useAtom(Project);
  const [commits, setCommits] = useAtom(Commits);
  const [selectedCommits, setSelectedCommits] = useAtom(Selected);
  const [diff, setDiff] = useState({ changes: "", commitHash: "" });
  const [page, setPage] = useState(1);
  const [parsedDiff, setParsedDiff] = useState<DiffFile[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  async function openDialog(key: string) {
    const res = await window.ipcRenderer.invoke("select-folder");
    if (res?.error) return toast(res.error);
    setProject((v) => ({ ...v, [key]: res.data }));
  }

  function toggleCommit(index: number) {
    let newSelected = selectedCommits.map(Number);
    if (newSelected.includes(index)) {
      newSelected = newSelected.filter((i) => i < index);
    } else {
      const min = Math.min(...newSelected, index);
      const max = Math.max(...newSelected, index);
      newSelected = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    }
    setSelectedCommits(newSelected.map(String));
  }

  async function updateBranch() {
    if (!project.source.path) {
      toast("Please select a source repository first");
      return false;
    }

    setIsUpdating(true);
    try {
      const res = await window.ipcRenderer.invoke("update-branch", {
        path: project.source.path,
      });

      if (res?.error) {
        toast(res.error);
        return false;
      }

      // Update project with latest branch information if it changed
      if (res.data.branch !== project.source.branch) {
        setProject((v) => ({
          ...v,
          source: {
            ...v.source,
            branch: res.data.branch
          }
        }));
        toast.success(`Branch updated to ${res.data.branch}`);
      } else {
        toast.success("Branch is up to date");
      }

      // Reload commits after successful update
      await loadCommits(false, true);
      return true;
    } catch (error) {
      toast.error(`Error updating branch: ${error}`);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }

  async function loadCommits(loadMore = false, skipUpdate = false) {
    if (!project.source.path) {
      toast("Please select a source repository first");
      return;
    }

    if (!skipUpdate && !loadMore) {
      setIsUpdating(true);
    }

    try {
      const res = await window.ipcRenderer.invoke("commits", {
        path: project.source.path,
        page: loadMore ? page + 1 : 1,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      const nextCommits = loadMore ? [...commits, ...res.data] : res.data;
      setCommits(nextCommits);
      setPage(loadMore ? page + 1 : 1);
    } catch (error) {
      toast.error(`Error loading commits: ${error}`);
    } finally {
      if (!skipUpdate && !loadMore) {
        setIsUpdating(false);
      }
    }
  }

  async function applyChanges() {
    if (selectedCommits.length === 0) {
      toast("Please select at least one commit");
      return;
    }

    if (!project.target.path) {
      toast("Please select a target repository");
      return;
    }

    setIsUpdating(true);
    try {
      const nextCommits = selectedCommits.map((i) => commits[Number(i)]);
      const res = await window.ipcRenderer.invoke("changes", {
        path: project.source.path,
        commitHash: nextCommits[0].hash,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      setDiff(res.data);

      // Parse the diff when it changes
      if (res.data.changes) {
        setParsedDiff(parseDiff(res.data.changes));
      }
    } catch (error) {
      toast.error(`Error applying changes: ${error}`);
    } finally {
      setIsUpdating(false);
    }
  }

  const BtnSelector = ({ type }: { type: string }) => {
    const p = project[type as keyof typeof project];
    return (
      <button
        onClick={() => openDialog(type)}
        className="text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded w-full"
      >
        {p.path ? `${p.path} - ${p.branch}` : `Select ${type}...`}
      </button>
    );
  };

  useEffect(() => {
    setSelectedCommits([]);
    if (project.source.path) {
      loadCommits();
    }
  }, [project.source.path]);

  return (
    <div className="flex flex-col gap-2 bg-white text-gray-900">
      <div className="sticky top-0 p-2 z-10 bg-white">
        {/* Improved topbar layout */}
        <div className="flex flex-col gap-3 border rounded p-3">
          <div className="grid grid-cols-[1fr,auto] gap-3 items-center">
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Source Repository</label>
              <BtnSelector type="source" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Target Repository</label>
              <BtnSelector type="target" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {project.source.path && (
              <div className="flex items-center gap-2">
                <button
                  onClick={updateBranch}
                  disabled={isUpdating}
                >
                  {isUpdating ? "Updating..." : "Fetch"}
                </button>
              </div>
            )}

            <button
              onClick={applyChanges}
              disabled={selectedCommits.length === 0 || !project.target.path || isUpdating}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
      <hr />
      <div className="flex flex-col gap-2 p-2">
        {commits.length > 0 ? (
          <>
            {commits.map((commit, index) => (
              <Fragment key={commit.hash}>
                <label
                  htmlFor={commit.hash}
                  className="flex gap-2 items-start"
                >
                  <input
                    id={commit.hash}
                    type="checkbox"
                    checked={selectedCommits.includes(index.toString())}
                    className="mt-1"
                    onChange={() => toggleCommit(index)}
                    disabled={isUpdating}
                  />
                  <div className="flex flex-1 flex-col gap-2 max-w-full">
                    <p className="leading-5">
                      <span className="text-md">{commit.message}</span>
                      &nbsp;
                      <span className="text-xs text-gray-600">
                        {new Date(commit.date).toLocaleString()} {commit.author}
                      </span>
                    </p>
                  </div>
                </label>
                {commit.hash === diff.commitHash && parsedDiff.length > 0 ? (
                  <DiffViewer files={parsedDiff} />
                ) : null}
              </Fragment>
            ))}

            <button
              onClick={() => loadCommits(true)}
              className="w-full py-2 text-sm text-blue-500 hover:text-blue-700 border-t mt-2"
              disabled={isUpdating}
            >
              Load more
            </button>
          </>
        ) : project.source.path ? (
          <div className="text-center text-gray-500 py-4">
            {isUpdating ? "Loading..." : "No commits found"}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            Select a source repository to view commits
          </div>
        )}
      </div>
      <ToastContainer
        autoClose={2000}
        theme="light"
        position="bottom-center"
        transition={Slide}
        hideProgressBar
        closeOnClick
      />
    </div>
  );
}

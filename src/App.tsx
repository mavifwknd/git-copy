import { useEffect, useMemo, useState } from "react";
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

  async function loadCommits(loadMore = false) {
    const res = await window.ipcRenderer.invoke("commits", {
      path: project.source.path,
      page: loadMore ? page + 1 : 1,
    });
    const nextCommits = loadMore ? [...commits, ...res.data] : res.data;
    setCommits(nextCommits);
    setPage(page + 1);
  }

  async function applyChanges() {
    const nextCommits = selectedCommits.map((i) => commits[Number(i)]);
    const res = await window.ipcRenderer.invoke("changes", {
      path: project.source.path,
      commitHash: nextCommits[0].hash,
    });
    setDiff(res.data);
    
    // Parse the diff when it changes
    if (res.data.changes) {
      setParsedDiff(parseDiff(res.data.changes));
    }
  }

  const BtnSelector = ({ type }: { type: string }) => {
    const p = project[type as keyof typeof project];
    return (
      <button onClick={() => openDialog(type)}>
        {p.path ? `${p.path} - ${p.branch}` : `Select ${type}...`}
      </button>
    );
  };

  useEffect(() => {
    setSelectedCommits([]);
    loadCommits();
  }, [project.source.path]);

  return (
    <div className="flex flex-col gap-2 bg-white text-gray-900">
      <div className="flex flex-col gap-2 p-2">
        <div className="flex flex-col gap-2">
          <BtnSelector type="source" />
          <BtnSelector type="target" />
          <button 
            onClick={applyChanges} 
            disabled={selectedCommits.length === 0 || !project.target.path}
          >
            Apply Changes
          </button>
        </div>
      </div>
      <hr />
      <div className="flex flex-col gap-2 p-2">
        {commits.map((commit, index) => (
          <label
            key={commit.hash}
            htmlFor={commit.hash}
            className="flex gap-2 items-start"
          >
            <input
              id={commit.hash}
              type="checkbox"
              checked={selectedCommits.includes(index.toString())}
              className="mt-1"
              onChange={() => toggleCommit(index)}
            />
            <div className="flex flex-col gap-2 w-full">
              <p className="leading-5">
                <span className="text-md">{commit.message}</span>
                &nbsp;
                <span className="text-xs text-gray-600">
                  {new Date(commit.date).toLocaleString()} {commit.author}
                </span>
              </p>
              {commit.hash === diff.commitHash && parsedDiff.length > 0 ? (
                <DiffViewer files={parsedDiff} />
              ) : null}
            </div>
          </label>
        ))}
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

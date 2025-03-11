import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const DefaultProject = {
  path: "",
  branch: "",
}

export const Project = atomWithStorage("project", {
  source: DefaultProject,
  target: DefaultProject,
});

export const Commits = atom<Commit[]>([]);

export const Selected = atom<string[]>([]);

interface Commit {
  hash: string;
  message: string;
  date: string;
  author: string;
}

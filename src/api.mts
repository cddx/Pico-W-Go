import { homedir } from "os";
import { join } from "path";
import { TextDecoder } from "util";
import {
  commands,
  extensions,
  window,
  workspace,
  env as vscodeEnv,
  Uri,
} from "vscode";

export const extName = "pico-w-go";
export const extId = "paulober.pico-w-go";

export const recommendedExtensions = [
  "ms-python.python",
  "visualstudioexptteam.vscodeintellicode",
  "ms-python.vscode-pylance",
];

/**
 * Opens the settings page for this extension in the settings editor window
 */
export function openSettings(): void {
  commands.executeCommand("workbench.action.openSettings", extName);
}

/**
 * Checks if any of the recommended extensions are not installed
 *
 * @returns true if any of the recommended extensions are not installed
 */
export function shouldRecommendExtensions(): boolean {
  return recommendedExtensions.some(extId => !extensions.getExtension(extId));
}

/**
 * Returns the path to the VS Code User settings/config folder
 *
 * @returns the path to the VS Code user folder
 */
export function getVsCodeUserPath(): string {
  const homeDir = homedir();

  let folder: string;

  switch (process.platform) {
    case "win32":
      folder = process.env.APPDATA || join(homeDir, "AppData", "Roaming");
      break;
    case "darwin":
      folder = join(homeDir, "Library", "Application Support");
      break;
    case "linux":
      folder = join(homeDir, ".config");
      break;
    default:
      folder = "/var/local";
  }

  return join(folder, "Code", "User");
}

/**
 * Returns the path to the currently opened project (aka first workspace folder)
 *
 * @returns the path to the currently opened project
 */
export function getProjectPath(): string | undefined {
  const workspaceFolders = workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return workspaceFolders[0].uri.fsPath;
  }
}

/**
 * Returns the path to the currently focused file in the editor
 *
 * @param remotePosix if true it returns for remote files (scheme pico) the
 * path in posix format and undefined for local file or if no file is selected.
 * If false it will return if focused file is local (scheme file) fsPath
 * and undefined for remote file and if no file is focused.  (@default false)
 * @returns the path to the currently selected file in the editor if scheme
 * is file is will return fsPath,
 * if scheme is pico it will return path, otherwise undefined
 */
export function getFocusedFile(
  remotePosix: boolean = false
): string | undefined {
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    return undefined;
  }

  const uri = editor.document.uri;

  if (uri.scheme === "file" && !remotePosix) {
    return uri.fsPath;
  } else if (uri.scheme === "pico" && remotePosix) {
    return uri.path;
  }

  return undefined;
}

/**
 * Returns the currently selected code or the current line if no selection is active
 *
 * @returns the currently selected code or the current line if no selection is active
 */
export function getSelectedCodeOrLine(): string | undefined {
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    return undefined;
  }

  const selection = editor.selection;
  // no active selection? => get the current line
  let codeSnippet = !selection.isEmpty
    ? editor.document.getText(selection)
    : editor?.document.lineAt(selection.active.line).text;

  return codeSnippet;
}

export function writeIntoClipboard(text: string): void {
  vscodeEnv.clipboard.writeText(text);
}

/**
 * Returns the path to the typeshed Pico-W-Stub the workspaceFolder name or null
 *
 * @returns the path to the typeshed Pico-W-Stub folder if it exists, the workspaceFolder name
 */
export async function getTypeshedPicoWStubPath(): Promise<
  [string, string] | null
> {
  const workspaceFolderUri = workspace.workspaceFolders?.[0].uri;

  if (!workspaceFolderUri) return null;

  const settingsUri = workspaceFolderUri.with({
    path: Uri.joinPath(workspaceFolderUri, ".vscode/settings.json").path,
  });

  try {
    // Read the contents of the settings.json file
    const settingsData = await workspace.fs.readFile(settingsUri);
    // Parse the settings data as a JSON object
    const settingsObject = JSON.parse(new TextDecoder().decode(settingsData));
    // Check if the typeshedPaths property includes "Pico-W-Stub"
    const typeshedPaths: Array<string> =
      settingsObject["python.analysis.typeshedPaths"];
    if (typeshedPaths) {
      const stubPath = typeshedPaths.find(path => path.includes("Pico-W-Stub"));
      if (stubPath !== undefined) {
        return [
          stubPath.replaceAll("\\", "/"),
          workspace.workspaceFolders![0].name,
        ];
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

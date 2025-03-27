import { StatusBarAlignment, commands, extensions, window } from "vscode";
import type { StatusBarItem } from "vscode";
import Logger from "./logger.mjs";
import { SettingsKey } from "./settings.mjs";
import type Settings from "./settings.mjs";
import { ContextKeys } from "./models/contextKeys.mjs";
import { extId } from "./api.mjs";

interface PkgJSON {
  statusBar: Array<{
    key: string;
    name: string;
    command: string;
    tooltip: string;
  }>;
  contributes: { commands: Array<{ title: string; command: string }> };
}

const pkg = (extensions.getExtension(extId)?.packageJSON as PkgJSON) ?? {
  statusBar: [],
  contributes: { commands: [] },
};

export default class UI {
  private settings: Settings;
  private logger: Logger;
  private visible = false;
  private initialized = false;
  private userOperationOngoing = 0;
  private lastState = false;

  private items: Record<string, StatusBarItem> = {};

  constructor(settings: Settings) {
    this.settings = settings;
    this.logger = new Logger("UI");
  }

  public init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    for (const item of pkg.statusBar) {
      this.items[item.key] = this.createStatusBarItem(
        item.key,
        item.name,
        item.command,
        item.tooltip
      );
    }
    this.statusbarItemPriority = Object.keys(this.items).length;

    this.setState(false);

    this.logger.debug("Initialized");
  }

  /**
   * Show the quick pick menu for MicroPico contributed commands.
   */
  public showQuickPick(): void {
    void commands.executeCommand("workbench.action.quickOpen", "> MicroPico: ");
  }

  public show(): void {
    if (this.visible) {
      return;
    }

    this.visible = true;

    const sbButtons = this.settings.getArray(SettingsKey.statusbarButtons);
    if (!sbButtons) {
      this.visible = false;

      return;
    }

    for (const key of sbButtons) {
      this.items[key].show();
    }
    this.items.listcommands.show();
  }

  public hide(): void {
    this.visible = false;

    for (const item of Object.values(this.items)) {
      item.hide();
    }
    this.items.listcommands.hide();
  }

  public isHidden(): boolean {
    return !this.visible;
  }

  private setButton(name: string, icon: string, text: string): void {
    this.items[name].text = `$(${icon}) ${text}`;
    if (this.visible) {
      this.items[name].show();
    }
  }

  private setState(connected: boolean): void {
    this.lastState = connected;
    this.setButton(
      "status",
      connected ? "check" : "debug-disconnect",
      connected ? "Pico Connected" : "Pico Disconnected"
    );
  }

  public setDisconnecting(): void {
    this.setButton("status", "watch", "Closing port...");
  }

  public getState(): boolean {
    return this.lastState;
  }

  public refreshState(force: boolean): void {
    this.setState(force);

    void commands.executeCommand("setContext", ContextKeys.isConnected, force);

    return;
  }

  private statusbarItemPriority = 14;

  private createStatusBarItem(
    key: string,
    name: string,
    command: string,
    tooltip: string
  ): StatusBarItem {
    const item = window.createStatusBarItem(
      StatusBarAlignment.Left,
      this.statusbarItemPriority--
    );
    item.text = name;
    item.command = command;
    item.tooltip = tooltip;

    /* don't auto activate
    if (
      this.settings.getArray(SettingsKey.statusbarButtons)?.includes(key) ||
      key === "listcommands"
    ) {
      item.show();
    }*/

    return item;
  }

  public userOperationStarted(): void {
    this.userOperationOngoing++;
    this.logger.debug("User operation started");

    // TODO: only if they are not both in settings enabled
    this.items.run.hide();
    this.items.stop.show();
  }

  public userOperationStopped(): void {
    this.userOperationOngoing--;
    this.logger.debug("User operation stopped");

    // TODO: only if they are not both in settings enabled
    this.items.stop.hide();
    this.items.run.show();
  }

  public isUserOperationOngoing(): boolean {
    return this.userOperationOngoing > 0;
  }

  public destroy(): void {
    for (const item of Object.values(this.items)) {
      item.dispose();
    }

    this.logger.debug("Destroyed");
  }
}

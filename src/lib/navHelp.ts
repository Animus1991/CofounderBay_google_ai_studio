import { bothText, withEl } from './labels';
import { pageHelpPair } from './pageRegistry';

/** What a page is for. Hover and the command list say this before the page opens. */
export function pageHelp(path: string): string | undefined {
  const help = pageHelpPair(path);
  return help ? bothText(help.en, help.el) : undefined;
}

/** Label plus what the page does, for a tooltip that works before the page opens. */
export function navTitle(label: string, path: string): string {
  const name = withEl(label);
  const help = pageHelp(path);
  return help ? `${name} — ${help}` : name;
}

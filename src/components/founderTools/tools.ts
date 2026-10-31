import { TOOL_DOCS } from '../../data/toolDocs';

/** Founder Tools tiles that open a calculator in FounderToolPanel. */
export const CALCULATOR_TOOLS = ['captable', 'safe', 'valuation', 'burn', 'model', 'equity', 'metrics'] as const;

/** True for every tile that opens something in FounderToolPanel (a calculator or a document outline). */
export function isInteractiveTool(toolId: string): boolean {
  return (CALCULATOR_TOOLS as readonly string[]).includes(toolId) || toolId in TOOL_DOCS;
}

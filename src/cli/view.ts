import { basename, join } from "node:path";
import { linksOf } from "../derive/links.ts";
import { countJudged, judgeExtraction } from "../derive/provenance.ts";
import { checkedExtraction, type Examination } from "./examine.ts";
// .txt: an .html import is a bundle to Bun and a document to lint for Biome
import page from "./view.html.txt" with { type: "text" };

// The extraction and everything derived from it, as one page: the files, the problems and
// the gaps, every rule and trigger judged, and the links between the concepts. undefined:
// no specimen/ in dir. Nothing is written: the page is the command's output.
export async function pageOf({
  dir,
  exists,
  readFiles,
}: Examination): Promise<string | undefined> {
  if (!(await exists(join(dir, "specimen")))) return undefined;
  const { extraction, problems, gaps } = checkedExtraction(await readFiles(dir));
  const judged = judgeExtraction(extraction);
  const data = {
    dir,
    name: basename(dir),
    extraction,
    problems,
    gaps,
    ...judged,
    counts: countJudged(judged),
    links: linksOf(extraction),
  };
  // "<" escaped: a body holding "</script>" does not end the page's data
  const json = JSON.stringify(data).replaceAll("<", "\\u003c");
  return page.replace("{{data}}", () => json);
}

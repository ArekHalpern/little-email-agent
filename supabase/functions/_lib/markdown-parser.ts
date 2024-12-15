import type { Root, RootContent } from "https://esm.sh/mdast@3.0.0";
import { fromMarkdown } from "https://esm.sh/mdast-util-from-markdown@1.3.1";
import { toMarkdown } from "https://esm.sh/mdast-util-to-markdown@1.5.0";
import { toString } from "https://esm.sh/mdast-util-to-string@3.2.0";
import { u } from "https://esm.sh/unist-builder@3.0.1";

export type Json = Record<
  string,
  string | number | boolean | null | Json[] | { [key: string]: Json }
>;

export type Section = {
  content: string;
  heading?: string;
  part?: number;
  total?: number;
};

export type ProcessedMd = {
  sections: Section[];
};

/**
 * Splits a `mdast` tree into multiple trees based on
 * a predicate function. Will include the splitting node
 * at the beginning of each tree.
 *
 * Useful to split a markdown file into smaller sections.
 */
export function splitTreeBy(
  tree: Root,
  predicate: (node: RootContent) => boolean
) {
  return tree.children.reduce<Root[]>((trees: Root[], node: RootContent) => {
    const [lastTree] = trees.slice(-1);

    if (!lastTree || predicate(node)) {
      const tree: Root = u('root', [node]);
      return trees.concat(tree);
    }

    lastTree.children.push(node);
    return trees;
  }, []);
}

/**
 * Splits markdown content by heading for embedding indexing.
 * Keeps heading in each chunk.
 *
 * If a section is still greater than `maxSectionLength`, that section
 * is chunked into smaller even-sized sections (by character length).
 */
export function processMarkdown(
  content: string,
  maxSectionLength = 2500
): ProcessedMd {
  const mdTree = fromMarkdown(content);

  if (!mdTree) {
    return {
      sections: [],
    };
  }

  const sectionTrees = splitTreeBy(mdTree, (node) => node.type === 'heading');

  const sections = sectionTrees.flatMap<Section>((tree: Root) => {
    const [firstNode] = tree.children;
    const content = toMarkdown(tree);

    const heading =
      firstNode.type === 'heading' ? toString(firstNode) : undefined;

    // Chunk sections if they are too large
    if (content.length > maxSectionLength) {
      const numberChunks = Math.ceil(content.length / maxSectionLength);
      const chunkSize = Math.ceil(content.length / numberChunks);
      const chunks = [];

      for (let i = 0; i < numberChunks; i++) {
        chunks.push(content.substring(i * chunkSize, (i + 1) * chunkSize));
      }

      return chunks.map((chunk, i) => ({
        content: chunk,
        heading,
        part: i + 1,
        total: numberChunks,
      }));
    }

    return {
      content,
      heading,
    };
  });

  return {
    sections,
  };
}
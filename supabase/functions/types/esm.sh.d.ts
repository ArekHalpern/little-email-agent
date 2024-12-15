declare module "https://esm.sh/@supabase/supabase-js@2.21.0" {
  export * from "@supabase/supabase-js";
}

declare module "https://esm.sh/mdast@3.0.0" {
  export interface Root {
    type: 'root';
    children: RootContent[];
  }
  export type RootContent = {
    type: string;
    children?: RootContent[];
  };
}

declare module "https://esm.sh/mdast-util-from-markdown@1.3.1" {
  import type { Root } from "https://esm.sh/mdast@3.0.0";
  export function fromMarkdown(content: string): Root;
}

declare module "https://esm.sh/mdast-util-to-markdown@1.5.0" {
  import type { Root } from "https://esm.sh/mdast@3.0.0";
  export function toMarkdown(tree: Root): string;
}

declare module "https://esm.sh/mdast-util-to-string@3.2.0" {
  import type { RootContent } from "https://esm.sh/mdast@3.0.0";
  export function toString(node: RootContent): string;
}

declare module "https://esm.sh/unist-builder@3.0.1" {
  import type { Root, RootContent } from "https://esm.sh/mdast@3.0.0";
  export function u(type: 'root', children: RootContent[]): Root;
} 
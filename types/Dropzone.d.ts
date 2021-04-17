/// <reference types="svelte" />
import { SvelteComponentTyped } from "svelte";

export type AllowsFrom =
  | "all"
  | "none"
  | "self"
  | "sameType"
  | "differentType"
  | "others";

export interface DropzoneProps {
  items?: Array<any>;

  /**
   * @default 'vertical'
   */
  direction?: "vertical" | "horizontal";

  dragHandle?: string;

  copy?: boolean;

  /**
   * @default (item) => { copyId += 1; return Object.assign({}, item, { id: `copy_${copyId}` }); }
   */
  copyFunction?: (item: any) => any;

  /**
   * @default 'default'
   */
  type?: string;

  /**
   * @default 'sameType'
   */
  allowsFrom?: AllowsFrom | AllowsFrom[] | string[];
}

export default class Dropzone extends SvelteComponentTyped<
  DropzoneProps,
  {},
  {
    default: {
      items: Array<any>;
      dnd: (element: HTMLElement) => { destroy };
      remove: (index: number) => void;
    };
  }
> {}

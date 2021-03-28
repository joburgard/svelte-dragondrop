/// <reference types="svelte" />
import { SvelteComponentTyped } from "svelte";

export interface DropzoneProps {
  items?: Array<any>;

  /**
   * @default "vertical"
   */
  direction?: "vertical" | "horizontal";

  dragHandle?: string;
}

export default class Dropzone extends SvelteComponentTyped<
  DropzoneProps,
  {},
  { default: { items: Array<any>; dnd: (element: HTMLElement) => { destroy } } }
> {}

# Svelte Dragondrop 🐉

The drag and drop library for Svelte that aims to be elegant _and_ powerful.

Currently not stable. (Wait for Version 1.0)

```
npm i -D svelte-dragondrop
```

## Usage

```svelte
<script>
  import Dropzone from 'svelte-dragondrop';

  let draggableItems = [
    // ...
  ];
</script>

<Dropzone
  bind:items={draggableItems}
  let:items
  let:dnd
  >
  <div use:dnd>
    {#each items as item (item.id)}
      <div class="p-8">{item.name}</div>
    {/each}
  </div>
</Dropzone>
```

## Settings

### items

An array of the items that you want to use for drag and drop.

### direction

`vertical` (default) or `horizontal`.

### dragHandle

If you want to use drag handles you can set this to a string. You have to set this as an html attribute in your markup.

```svelte
<Dropzone dragHandle="drag-handle">
  <!-- ... -->
  <div drag-handle />
  <!-- ... -->
</Dropzone>
```

## Slot Props

### let:items

The array of items that you passed to Dropzone (useful for code portability)

### let:dnd

The Svelte action that has to be used on the parent element of the draggable elements.

### let:remove

A function that you can call with the `index` of the element to remove it from the `items` array.

```svelte
<Dropzone let:remove ...>
  ...
  {#each items as item, index (item.id)}
    ...
    <div on:click={() => remove(index)}>
      Remove
    </div>
    ...
  {/each}
  ...
</Dropzone>
```

## License

The code is released into the public domain. Use it in any way you want.
See `LICENSE.txt` and https://unlicense.org/

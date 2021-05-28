<script context="module">
	import { writable } from 'svelte/store';

	let dropzonesCurrentId = 0;
	let copyId = 0;

	const dropzones = writable({});
	const draggedItems = writable([]);
	const startZone = writable(null);
	const targetZone = writable(null);
	const placeholderZone = writable(null);
	const startIndex = writable(null);
	const placeholderIndex = writable(null);
	const targetIndex = writable(null);

	function registerDropzone(dropzone) {
		dropzones.update((current) => {
			current[dropzonesCurrentId] = dropzone;
			return current;
		});
		dropzonesCurrentId += 1;
		return '' + (dropzonesCurrentId - 1);
	}

</script>

<script>
	import { createEventDispatcher, tick } from 'svelte';

	/**
	 * @slot {{ items: Array<any>; dnd: (element: HTMLElement) => { destroy }; remove: (index: number) => void }}
	 */

	/** @type {Array<any>} */
	export let items;

	/** @type {'vertical'|'horizontal'} */
	export let direction = 'vertical';

	/** @type {string} */
	export let dragHandle;

	/** @type {boolean} */
	export let copy;

	/** @type {(item: any) => any} */
	export let copyFunction = (item) => {
		copyId += 1;
		return Object.assign({}, item, { id: `copy_${copyId}` });
	};

	/** @type {string} */
	export let type = 'default';

	/** @typedef {('all'|'none'|'self'|'sameType'|'differentType'|'others')} AllowsFrom */
	/** @type {AllowsFrom|AllowsFrom[]|string[]} */
	export let allowsFrom = 'sameType';

	/** @type {number} */
	export let autoScrollSpeed = 5;
	/** @type {number} */
	export let autoScrollEdgeDistance = 50;

	let dropzone;
	let dropzoneId;

	let itemsReset;

	let pointerX;
	let pointerY;
	let referenceX;
	let referenceY;
	let isScrolling = true;

	/** @type {HTMLElement} */
	let dragVisual;
	let dragVisualOffsetX;
	let dragVisualOffsetY;

	let placeholderStylesReset;

	// *** loop() ***
	/** @type {HTMLElement} */
	let elementAtConsiderPosition;
	let loopRequestedAnimationFrame;
	let dragVisualRect;
	let considerX;
	let considerY;
	let elementAtPointerCenterX;
	let elementAtPointerCenterY;

	const dispatch = createEventDispatcher();

	$: items && dropzone && setup();

	function triggerSvelteUpdate() {
		items = items;
	}

	/**
	 * Removes the item at the specified index
	 * @param {number} index
	 */
	function remove(index) {
		items.splice(index, 1);
		triggerSvelteUpdate();
	}

	function setup() {
		// this is needed for the case that a new array is passed to the component
		$dropzones[dropzoneId].items = items;

		if (dragHandle) {
			dropzone
				.querySelectorAll(`[${dragHandle}]`)
				.forEach((element) => (element.style.cursor = 'grab'));
		}
		dropzone.childNodes.forEach((child) => {
			if (!dragHandle) child.style.cursor = 'grab';
			child.addEventListener('mousedown', startDrag);
		});
	}

	/**
	 * @param {HTMLElement} element
	 */
	function createDragVisual(element) {
		dragVisual && dragVisual.remove();
		dragVisual = element.cloneNode(true);
		dragVisual.style.width = `${element.getBoundingClientRect().width}px`;
		dragVisual.style.height = `${element.getBoundingClientRect().height}px`;
		dragVisual.style.position = 'absolute';
		dragVisual.style.top = '0';
		dragVisual.style.left = '0';
		dragVisual.style.zIndex = '9999';
		dragVisual.style.userSelect = 'none';
		dragVisual.style.cursor = 'grabbing';
		if (dragHandle) {
			dragVisual
				.querySelectorAll(`[${dragHandle}]`)
				.forEach((element) => (element.style.cursor = ''));
		}
		document.body.appendChild(dragVisual);
	}

	/**
	 * @param {MouseEvent} event
	 */
	function updatePointerPosition(event) {
		pointerX = event.clientX;
		pointerY = event.clientY;
	}

	/**
	 * @param {HTMLElement} element
	 */
	function getIndexOfElement(element) {
		return Array.prototype.indexOf.call(element.parentNode.children, element);
	}

	/**
	 * @param {HTMLElement} element
	 */
	function getCenterOfElement(element) {
		return [
			element.getBoundingClientRect().x + Math.round(element.getBoundingClientRect().width / 2),
			element.getBoundingClientRect().y + Math.round(element.getBoundingClientRect().height / 2)
		];
	}

	function getPlaceholderElement() {
		return $placeholderZone.element.children[$placeholderIndex];
	}

	function stylePlaceholder() {
		/** @type {HTMLElement} */
		let placeholder = getPlaceholderElement();
		if (!placeholderStylesReset) {
			placeholderStylesReset = placeholder.style.cssText;
		}
		placeholder.style.opacity = '0.5';
	}

	function unstylePlaceholder() {
		getPlaceholderElement().style = placeholderStylesReset;
	}

	/**
	 * @param {string} allowsFrom
	 */
	function checkAllowsFrom(allowsFrom) {
		switch (allowsFrom) {
			case 'all':
				return true;
			case 'self':
				if ($targetZone === $startZone) return true;
				return false;
			case 'sameType':
				if ($targetZone.type === $startZone.type) return true;
				return false;
			case 'differentType':
				if ($targetZone.type !== $startZone.type) return true;
				return false;
			case 'others':
				if ($targetZone !== $startZone) return true;
				return false;
			default:
				return false;
		}
	}

	function isAllowedToDrop() {
		if (typeof $targetZone.allowsFrom === 'string') {
			return checkAllowsFrom($targetZone.allowsFrom);
		} else if (Array.isArray($targetZone.allowsFrom)) {
			for (const ruleOrType of $targetZone.allowsFrom) {
				if (checkAllowsFrom(ruleOrType) || ruleOrType === $startZone.type) return true;
			}
		}
		return false;
	}

	/**
	 * @param {MouseEvent} event
	 */
	function startDrag(event) {
		event.stopPropagation();
		// support for dragHandle
		if (dragHandle && !event.target.matches(`[${dragHandle}], [${dragHandle}] *`)) {
			return;
		}

		// prepare the data
		{
			updatePointerPosition(event);
			itemsReset = [...items];

			if (!copy) {
				$startIndex = getIndexOfElement(event.currentTarget);
				$placeholderIndex = $startIndex;
				$targetIndex = $startIndex;
				$startZone = $dropzones[dropzoneId];
				$targetZone = $dropzones[dropzoneId];
				$placeholderZone = $dropzones[dropzoneId];
				$draggedItems = items[$placeholderIndex];
			} else {
				$startIndex = null;
				$placeholderIndex = null;
				$targetIndex = null;
				$startZone = $dropzones[dropzoneId];
				$targetZone = null;
				$placeholderZone = null;
				$draggedItems = copyFunction(items[getIndexOfElement(event.currentTarget)]);
			}

			[referenceX, referenceY] = getCenterOfElement(event.currentTarget);
		}

		// create visual representation that follows the pointer
		{
			createDragVisual(event.currentTarget);
			dragVisualOffsetX =
				event.currentTarget.getBoundingClientRect().x - pointerX + window.pageXOffset;
			dragVisualOffsetY =
				event.currentTarget.getBoundingClientRect().y - pointerY + window.pageYOffset;
		}

		// prevent text selection
		document.body.style.userSelect = 'none';

		!copy && stylePlaceholder();

		window.addEventListener('mousemove', updatePointerPosition);
		window.addEventListener('mouseup', stopDrag);
		loop();
	}

	function stopDrag() {
		$placeholderZone && unstylePlaceholder();
		dragVisual.remove();
		placeholderStylesReset = null;
		document.body.style.userSelect = '';
		cancelAnimationFrame(loopRequestedAnimationFrame);
		window.removeEventListener('mousemove', updatePointerPosition);
		window.removeEventListener('mouseup', stopDrag);
		dispatch('drop', {
			startZone: $startZone,
			startIndex: $startIndex,
			targetZone: $targetZone,
			targetIndex: $targetIndex,
			draggedItems: $draggedItems
		});
	}

	function loop() {
		loopRequestedAnimationFrame = requestAnimationFrame(loop);

		// let the dragVisual follow the pointer
		{
			// prettier-ignore
			dragVisual.style.transform = `translate3d(
					${pointerX + window.pageXOffset + dragVisualOffsetX}px,
					${pointerY + window.pageYOffset + dragVisualOffsetY}px,
					0
				)`;
		}

		// scroll the dropzone if the mouse is near the edge | autoScroll
		{
			if ($targetZone) {
				if (direction === 'vertical') {
					if (
						Math.abs(pointerY - $targetZone.element.getBoundingClientRect().y) <=
							autoScrollEdgeDistance &&
						$targetZone.element.scrollTop !== 0
					) {
						// top edge
						$targetZone.element.scrollBy(0, -autoScrollSpeed);
						isScrolling = true;
					} else if (
						Math.abs($targetZone.element.getBoundingClientRect().bottom - pointerY) <=
							autoScrollEdgeDistance &&
						$targetZone.element.offsetHeight + $targetZone.element.scrollTop !==
							$targetZone.element.scrollHeight
					) {
						// bootom edge
						$targetZone.element.scrollBy(0, autoScrollSpeed);
						isScrolling = true;
					}
				} else {
					if (
						Math.abs(pointerX - $targetZone.element.getBoundingClientRect().x) <=
							autoScrollEdgeDistance &&
						$targetZone.element.scrollRight !== 0
					) {
						// left edge
						$targetZone.element.scrollBy(-autoScrollSpeed, 0);
						isScrolling = true;
					} else if (
						Math.abs($targetZone.element.getBoundingClientRect().right - pointerX) <=
							autoScrollEdgeDistance &&
						$targetZone.element.offsetWidth + $targetZone.element.scrollRight !==
							$targetZone.element.scrollWidth
					) {
						// right edge
						$targetZone.element.scrollBy(autoScrollSpeed, 0);
						isScrolling = true;
					}
				}
			}
		}

		// skip if the dropzone is currently scrolling (this prevents back and forth placement)
		if (isScrolling) {
			isScrolling = false;
			return;
		}

		// set consider point
		if ($targetZone) {
			dragVisualRect = dragVisual.getBoundingClientRect();
			// use center of directional side of element rectangle as the consider point
			if ($targetZone.direction === 'vertical') {
				considerX = dragVisualRect.x + Math.round(dragVisualRect.width / 2);
				if (pointerY <= referenceY) {
					// going up
					considerY = dragVisualRect.y;
				} else {
					// going down
					considerY = dragVisualRect.y + dragVisualRect.height;
				}
			} else {
				// horizontal
				considerY = dragVisualRect.y + Math.round(dragVisualRect.height / 2);
				if (pointerX <= referenceX) {
					// going left
					considerX = dragVisualRect.x;
				} else {
					// going right
					considerX = dragVisualRect.x + dragVisualRect.width;
				}
			}
		} else {
			considerX = pointerX;
			considerY = pointerY;
		}

		// get element at the consider position
		{
			dragVisual.style.pointerEvents = 'none';
			elementAtConsiderPosition = document.elementFromPoint(considerX, considerY);
			// use pointer position if it isnt over placeholderZone
			if (
				$placeholderZone &&
				(!elementAtConsiderPosition ||
					!elementAtConsiderPosition?.matches(
						`[data-dropzone-id="${$placeholderZone.element.dataset.dropzoneId}"],
						 [data-dropzone-id="${$placeholderZone.element.dataset.dropzoneId}"] *`
					)) &&
				!document.elementFromPoint(pointerX, pointerY)?.matches(
					`[data-dropzone-id="${$placeholderZone.element.dataset.dropzoneId}"],
						 [data-dropzone-id="${$placeholderZone.element.dataset.dropzoneId}"] *`
				)
			) {
				elementAtConsiderPosition = document.elementFromPoint(pointerX, pointerY);
				considerX = pointerX;
				considerY = pointerY;
			}
			dragVisual.style.pointerEvents = '';
		}

		// skip if position is not over a dropzone or it is the placeholder
		if (
			!elementAtConsiderPosition ||
			getPlaceholderElement()?.contains(elementAtConsiderPosition)
		) {
			return;
		}

		// place placeholder before or after elementAtPointerPosition
		if (elementAtConsiderPosition.matches('[data-dropzone-id] *')) {
			// get the direct child of the dropzone
			while (!elementAtConsiderPosition.parentElement.matches('[data-dropzone-id]')) {
				elementAtConsiderPosition = elementAtConsiderPosition.parentElement;
			}

			$targetZone = $dropzones[elementAtConsiderPosition.parentElement.dataset.dropzoneId];

			// skip if not allowed to drop
			if (!isAllowedToDrop()) {
				return;
			}

			[elementAtPointerCenterX, elementAtPointerCenterY] = getCenterOfElement(
				elementAtConsiderPosition
			);

			// if the placeholder moves to a new dropzone it will be placed
			// at the position of the element it hovers over
			if ($placeholderZone !== $targetZone) {
				$targetIndex = getIndexOfElement(elementAtConsiderPosition);
			}
			// center point decides if placed before or after
			else if (
				($targetZone.direction === 'vertical' && pointerY <= referenceY) ||
				($targetZone.direction === 'horizontal' && pointerX <= referenceX)
			) {
				// going up or left
				if (
					($targetZone.direction === 'vertical' && considerY <= elementAtPointerCenterY) ||
					($targetZone.direction === 'horizontal' && considerX <= elementAtPointerCenterX)
				) {
					// place before
					$targetIndex = getIndexOfElement(elementAtConsiderPosition);
				} else {
					// place after
					$targetIndex = getIndexOfElement(elementAtConsiderPosition) + 1;
				}
			} else {
				// going down or right
				if (
					($targetZone.direction === 'vertical' && considerY <= elementAtPointerCenterY) ||
					($targetZone.direction === 'horizontal' && considerX <= elementAtPointerCenterX)
				) {
					// place before
					$targetIndex = getIndexOfElement(elementAtConsiderPosition) - 1;
				} else {
					// place after
					$targetIndex = getIndexOfElement(elementAtConsiderPosition);
				}
			}

			placePreview();
		}
		// considered Position is over a container but not over an item
		else if (elementAtConsiderPosition.matches('[data-dropzone-id]')) {
			$targetZone = $dropzones[elementAtConsiderPosition.dataset.dropzoneId];

			// skip if it is already in that dropzone or not allowed to drop
			if ($placeholderZone === $targetZone || !isAllowedToDrop()) {
				return;
			}

			// we want to place the item at the end of the container
			$targetIndex = $dropzones[elementAtConsiderPosition.dataset.dropzoneId].items.length;
			placePreview();
		} else {
			return;
		}
	}

	function placePreview() {
		// skip if it is already in the same place
		if (
			$placeholderZone !== null &&
			$targetZone !== null &&
			$placeholderZone === $targetZone &&
			$placeholderIndex === $targetIndex
		) {
			return;
		}

		// copied but not yet placed
		if ($placeholderZone === null) {
			$targetZone.items.splice($targetIndex, 0, $draggedItems);
			$placeholderIndex = $targetIndex;
		} else {
			// move placeholder to new position
			$targetZone.items.splice(
				$targetIndex,
				0,
				...$placeholderZone.items.splice($placeholderIndex, 1)
			);
		}

		// this is necessary for svelte to know the value changed
		$placeholderZone?.triggerSvelteUpdate();
		$targetZone.triggerSvelteUpdate();

		tick().then(() => {
			const movedToNewDropzone = $targetZone !== $placeholderZone;

			$placeholderZone = $targetZone;
			$placeholderIndex = $targetIndex;

			if (movedToNewDropzone) {
				placeholderStylesReset = '';
				stylePlaceholder();
			}
			[referenceX, referenceY] = getCenterOfElement(getPlaceholderElement());
		});
	}

	/**
	 * @param {HTMLElement} element
	 */
	function dnd(element, params) {
		dropzone = element;

		dropzoneId = registerDropzone({
			element,
			items,
			direction,
			type,
			allowsFrom,
			triggerSvelteUpdate,
			reset: () => (items = itemsReset)
		});

		dropzone.dataset.dropzoneId = dropzoneId;

		return {
			update: () => {
				setup();
			},
			destroy: () => {
				if (!dropzone) return;
				dropzone.childNodes.forEach((child) => {
					child.removeEventListener('mousedown', startDrag);
				});
				window.removeEventListener('mousemove', updatePointerPosition);
				window.removeEventListener('mouseup', stopDrag);
			}
		};
	}

</script>

<slot {items} {dnd} {remove} />

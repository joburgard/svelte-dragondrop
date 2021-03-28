<script context="module">
	import { writable } from 'svelte/store';

	let dropzonesCurrentId = 0;

	const dropzones = writable({});
	const draggedItems = writable([]);
	const startZone = writable(null);
	const targetZone = writable(null);
	const placeholderZone = writable(null);
	const startIndex = writable(null);
	const targetIndex = writable(null);

	function registerDragzone(dragzone) {
		dropzones.update((current) => {
			current[dropzonesCurrentId] = dragzone;
			return current;
		});
		dropzonesCurrentId += 1;
		return '' + (dropzonesCurrentId - 1);
	}
</script>

<script>
	import { tick } from 'svelte';

	/**
	 * @slot {{ items: Array<any>; dnd: (element: HTMLElement) => { destroy } }}
	 */

	/** @type {Array<any>} */
	export let items;
	/** @type {'vertical'|'horizontal'} */
	export let direction = 'vertical';
	/** @type {string} */
	export let dragHandle;

	let dropzone;
	let itemsReset;

	let dropzoneId;

	let pointerX;
	let pointerY;
	let referenceX;
	let referenceY;

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

	$: items && dropzone && setup();

	function triggerSvelteUpdate() {
		items = items;
	}

	function remove(index) {
		items.splice(index, 1);
		triggerSvelteUpdate();
	}

	function setup() {
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
		return $placeholderZone.dragzone.children[$targetIndex];
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
	 * @param {MouseEvent} event
	 */
	function startDrag(event) {
		// support for dragHandle
		if (dragHandle && !event.target.matches(`[${dragHandle}], [${dragHandle}] *`)) {
			return;
		}

		// prepare the data
		{
			updatePointerPosition(event);
			itemsReset = [...items];
			$startIndex = getIndexOfElement(event.currentTarget);
			$targetIndex = $startIndex;
			$startZone = $dropzones[dropzoneId];
			$targetZone = $dropzones[dropzoneId];
			$placeholderZone = $dropzones[dropzoneId];
			$draggedItems = items[$startIndex];
			[referenceX, referenceY] = getCenterOfElement(event.currentTarget);
		}

		// create visual representation that follows the pointer
		{
			createDragVisual(event.currentTarget);
			dragVisualOffsetX = pointerX + window.pageXOffset - event.currentTarget.offsetLeft;
			dragVisualOffsetY = pointerY + window.pageYOffset - event.currentTarget.offsetTop;
		}

		// prevent text selection
		document.body.style.userSelect = 'none';

		stylePlaceholder();

		window.addEventListener('mousemove', updatePointerPosition);
		window.addEventListener('mouseup', stopDrag);
		loop();
	}

	function stopDrag() {
		unstylePlaceholder();
		dragVisual.remove();
		placeholderStylesReset = null;
		document.body.style.userSelect = '';
		cancelAnimationFrame(loopRequestedAnimationFrame);
		window.removeEventListener('mousemove', updatePointerPosition);
		window.removeEventListener('mouseup', stopDrag);
	}

	function loop() {
		loopRequestedAnimationFrame = requestAnimationFrame(loop);
		// let the dragVisual follow the pointer
		{
			// prettier-ignore
			dragVisual.style.transform = `translate3d(
					${pointerX + window.pageXOffset - dragVisualOffsetX}px,
					${pointerY + window.pageYOffset - dragVisualOffsetY}px,
					0
				)`;
		}

		// set consider point
		{
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
		}

		// get element at the consider position
		{
			dragVisual.style.pointerEvents = 'none';
			elementAtConsiderPosition = document.elementFromPoint(considerX, considerY);
			// use pointer position if it isnt over placeholderZone
			if (
				!elementAtConsiderPosition ||
				!elementAtConsiderPosition?.matches(
					`[data-dragzone-id="${$startZone.dragzone.dataset.dragzoneId}"], [data-dragzone-id="${$startZone.dragzone.dataset.dragzoneId}"] *`
				)
			) {
				elementAtConsiderPosition = document.elementFromPoint(pointerX, pointerY);
				considerX = pointerX;
				considerY = pointerY;
			}
			dragVisual.style.pointerEvents = '';
		}

		// skip if position is not over a dragzone or it is the placeholder
		if (!elementAtConsiderPosition || elementAtConsiderPosition === getPlaceholderElement()) {
			return;
		}

		// place placeholder before or after elementAtPointerPosition
		if (elementAtConsiderPosition.matches('[data-dragzone-id] *')) {
			// get the direct child of the dragzone
			while (!elementAtConsiderPosition.parentElement.matches('[data-dragzone-id]')) {
				elementAtConsiderPosition = elementAtConsiderPosition.parentElement;
			}

			$targetZone = $dropzones[elementAtConsiderPosition.parentElement.dataset.dragzoneId];

			[elementAtPointerCenterX, elementAtPointerCenterY] = getCenterOfElement(
				elementAtConsiderPosition
			);

			// if the placeholder moves to a new dragzone it will be placed
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
		// move placeholder to new dragzone
		else if (
			elementAtConsiderPosition.matches('[data-dragzone-id]') &&
			$dropzones[elementAtConsiderPosition.dataset.dragzoneId].items.length === 0
		) {
			$targetZone = $dropzones[elementAtConsiderPosition.dataset.dragzoneId];
			$targetIndex = 0;
			placePreview();
		} else {
			return;
		}
	}

	function placePreview() {
		// skip if it is already in the same place
		if ($placeholderZone === $targetZone && $startIndex === $targetIndex) {
			return;
		}

		// move placeholder to new position
		$targetZone.items.splice($targetIndex, 0, ...$placeholderZone.items.splice($startIndex, 1));

		// this is necessary for svelte to know the value changed
		$placeholderZone.triggerSvelteUpdate();
		$targetZone.triggerSvelteUpdate();

		tick().then(() => {
			const movedToNewDragzone = $targetZone !== $placeholderZone;

			$placeholderZone = $targetZone;
			$startIndex = $targetIndex;

			if (movedToNewDragzone) {
				placeholderStylesReset = '';
				stylePlaceholder();
			}
			[referenceX, referenceY] = getCenterOfElement(getPlaceholderElement());
		});
	}

	/**
	 * @param {HTMLElement} element
	 */
	function dnd(element) {
		dropzone = element;

		dropzoneId = registerDragzone({
			dragzone: dropzone,
			items,
			direction,
			triggerSvelteUpdate,
			reset: () => (items = itemsReset)
		});

		dropzone.dataset.dragzoneId = dropzoneId;

		return {
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

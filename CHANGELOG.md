# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add type information for the `remove` function that is passed to the slot
- Copy on dragstart functionality. Does a shallow copy by default and changes the id property. A custom copy function can be supplied.
- Zone `type`s and `allowsFrom` property - this lets you control where things can be sorted and dropped.
- `drop` event. This can be used to track changes and implement undo/redo functionality.

### Changed

- Simplify example in readme file
- Change indentation to spaces in readme file
- Improved behavior when dragging into another dropzone. If not dragged over another item it will default to appending at the end.

### Fixed

- The `startDrag` event stops the propagation. This makes it possible to have dropzones in dropzones.

## [0.1.0] - 2021-03-28

### Added

- `remove` function is passed to the `<slot/>`
- Add type files for Typescript support

### Changed

- Renamed `Dragzone` to `Dropzone`
- Improved README with example code and documentation.
- Prevent text selection while dragging.

### Fixed

- Dragging into a Dropzone with a different 'direction' now works correctly.

## [0.0.1] - 2021-03-21

### Added

- Initial functionality for dragging and dropping

[unreleased]: https://github.com/joburgard/svelte-dragondrop/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/joburgard/svelte-dragondrop/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/joburgard/svelte-dragondrop/releases/tag/v0.0.1

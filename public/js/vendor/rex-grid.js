void (function (window, factory) {
	'use strict';
	window.RexGrid = factory(window);
})('undefined' !== typeof window ? window : this, function (window) {
	var instances = [];

	/* ===== Utilities ===== */
	var Utils = {
		/**
		 * Calculate viewport window and height.
		 * @return	{Object}	Window width & height
		 * @since		1.0.0
		 */
		viewport: function () {
			var e = window,
				a = 'inner';
			if (!('innerWidth' in window)) {
				a = 'client';
				e = document.documentElement || document.body;
			}
			return { width: e[a + 'Width'], height: e[a + 'Height'] };
		},

		/**
		 * Extending defaults with user options
		 * @param  {Object} source
		 * @param  {Object} properties
		 * @since	 1.0.0
		 */
		extendDefaults: function (source, properties) {
			var property;
			for (property in properties) {
				if (properties.hasOwnProperty(property)) {
					source[property] = properties[property];
				}
			}
			return source;
		},

		/**
		 * Checks if an element matches a selector class
		 * @param  {Node}			el
		 * @param  {String}		selector
		 * @return {Boolean}	Does the element match the given selector?
		 * @since  1.0.0
		 */
		matches: function (el, selector) {
			return (
				el.matches ||
				el.matchesSelector ||
				el.msMatchesSelector ||
				el.mozMatchesSelector ||
				el.webkitMatchesSelector ||
				el.oMatchesSelector
			).call(el, selector);
		},

		/**
		 * Search for parent ancestor element in vanillaJS
		 * @param  {Node}					el
		 * @param  {String}				selector
		 * @return {Node|null}	Parent node that matches the given selector if does exist, null otherwise
		 * @since	 1.0.0
		 */
		parents: function (el, selector) {
			while (el.parentNode) {
				if (Utils.matches(el, selector)) {
					return el;
				}
				el = el.parentNode;
			}
			return null;
		},

		/**
		 * Checks if a number or a String
		 * representing a Number is even
		 * and returns true if so.
		 * @param  {Number | String} num		Number to check
		 * @return {Boolean}								Is the number even?
		 * @since  1.0.0
		 */
		isEven: function (num) {
			if (typeof num === 'string') {
				num = parseInt(num);
			}

			if (!isNaN(num)) {
				return num % 2 === 0;
			} else {
				throw new Error('The value passed is not a Number or a String representing a Number');
			}
		},
		/**
		 * Removing className if present, adding className if not present.
		 * @param  {Element} 	el
		 * @param  {String} 	className
		 * @return {void}
		 * @since  1.0.0
		 */
		toggleClass: function (el, className) {
			if (hasClass(el, className)) {
				Utils.removeClass(el, className);
			} else {
				Utils.addClass(el, className);
			}
		},

		getCoord: function (val, maxWidth) {
			return {
				x: val % maxWidth,
				y: Math.floor(val / maxWidth)
			};
		}
	};

	// Class manipulation utils
	if ('classList' in document.documentElement) {
		Utils.hasClass = function (el, className) {
			return el.classList.contains(className);
		};
		Utils.addClass = function (el, className) {
			el.classList.add(className);
		};
		Utils.removeClass = function (el, className) {
			el.classList.remove(className);
		};
	} else {
		Utils.hasClass = function (el, className) {
			return new RegExp('\\b' + className + '\\b').test(el.className);
		};
		Utils.addClass = function (el, className) {
			if (!hasClass(el, className)) {
				el.className += ' ' + className;
			}
		};
		Utils.removeClass = function (el, className) {
			el.className = el.className.replace(new RegExp('\\b' + className + '\\b', 'g'), '');
		};
	}

	/* ===== Global vars ===== */
	var globalViewportSize = Utils.viewport();

	/* ===== RexBlock Constructor ===== */
	function RexBlock(options) {
		this.el = options.el;
		this.blockData = this.el.querySelector('.rexbuilder-block-data');
		this.id = options.id;
		this.w = options.w;
		this.h = options.h;
		this.x = options.x;
		this.y = options.y;
		this.start_x = this.x;
		this.start_y = this.y;
		this.start_h = parseInt(this.blockData.getAttribute('data-gs_start_h'));
		this.hide = options.hide;
		this.domIndex = this.x + this.y * 12;
		this.toCheck = options.toCheck;
		this.setHeight = true;
		this.setTop = true;
	}

	RexBlock.prototype.refreshProperties = function () {
		this.refreshCoords();
		this.refreshHide();
		this.refreshDOMIndex();
	};

	RexBlock.prototype.refreshCoords = function () {
		this.w = parseInt(this.el.getAttribute('data-gs-width'));
		this.h = parseInt(this.el.getAttribute('data-gs-height'));

		this.x = parseInt(this.el.getAttribute('data-gs-x'));
		this.y = parseInt(this.el.getAttribute('data-gs-y'));

		// WARNING: this reset must occur only on layout change!
		// this.start_h = this.h;
		this.start_h = parseInt(this.blockData.getAttribute('data-gs_start_h'));
		this.start_x = this.x;
		this.start_y = this.y;
	};

	RexBlock.prototype.refreshHide = function () {
		this.hide = Utils.hasClass(this.el, 'rex-hide-element');
	};

	/**
	 * Re-calculating DOMIndex.
	 * @return 	{void}
	 * @since		1.0.0
	 */
	RexBlock.prototype.refreshDOMIndex = function () {
		this.domIndex = this.x + this.y * 12;
	};

	/**
	 * Destroy a RexBlock instance
	 * @return 	{void}
	 * @since		1.0.0
	 */
	RexBlock.prototype.destroy = function () {
		this.el.style.top = '';
		this.el.style.height = '';
	};

	/* ===== RexGrid Plugin constructor ===== */
	function RexGrid() {
		/**
		 * Setup class constants
		 * @since 2.2.0
		 */
		this.REX_BLOCK_FORCE_MASONRY_CLASSNAME = 'rex-block--force-masonry'
		/**
		 * Grid DOM Element.
		 * It's identified by the class .perfect-grid-gallery
		 * because we get it from Rexpansive builder.
		 */
		this.element = null;

		/**
		 * Block elements inside the grid.
		 * It is possibile to have 0 blocks.
		 * They're identified by the class .perfect-grid-item
		 * because we get them from Rexpansive builder.
		 */
		this.gridBlocks = [];
		this.gridBlocksTotal = 0;

		/**
		 * Block element to not instatiate in the grid
		 * We found them with the class .rex-block--no-flow
		 */
		this.noFlowBlocks = []

		/**
		 * Section DOM Element.
		 * It's identified by the class .rexpansive_section
		 * because we get it from Rexpansive builder.
		 */
		this.section = null;
		this.sectionData = null;

		// Getting grid element as first argument
		if (arguments[0]) {
			this.element = arguments[0];
			this.section = Utils.parents(this.element, '.rexpansive_section');
			this.sectionData = this.section.querySelector('.section-data');
		}

		// Default options values
		var defaults = {
			gutter: 20,
			columns: 12
		};

		// Create options by extending defaults with the passed in arugments.
		// Get options as second argument
		if (arguments[1] && 'object' === typeof arguments[1]) {
			this.options = Utils.extendDefaults(defaults, arguments[1]);
		} else {
			this.options = defaults;
		}

		this.properties = {
			id: '',
			gridWidth: 0,
			layout: 'fixed',
			oneColumnModeActive: false,
			noMobileLayoutSaved: false,
			fullHeight: false,
			gridHeightSettable: true,
			singleWidth: 0,
			singleHeight: 0,
			halfSeparator: 0,
			halfSeparatorTop: 0,
			halfSeparatorRight: 0,
			halfSeparatorBottom: 0,
			halfSeparatorLeft: 0,
			halfSeparatorBlockTop: 0,
			halfSeparatorBlockRight: 0,
			halfSeparatorBlockBottom: 0,
			halfSeparatorBlockLeft: 0,
			gridTopSeparator: null,
			gridRightSeparator: null,
			gridBottomSeparator: null,
			gridLeftSeparator: null,
			setMobilePadding: false,
			setDesktopPadding: false,
			editedFromBackend: false,
			filterRule: false,
			filterCoords: [],
			forceMasonryPositions: false
		};

		_init.call(this);
	}

	/* ===== Private Methods ===== */
	function _init() {
		// get RexGrid options
		_getGridAttributes.call(this);

		// Getting gutters from DOM attributes
		_getDOMGutterOptions.call(this);

		// Setting instance properties
		_setGridGutterProperties.call(this);
		_setBlocksGutterProperties.call(this);

		// Applying grid separators
		_applyGridSeparators.call(this);

		// Calculations of grid width. In this way it's possible to access to this
		// value without causing a layout reflow
		_calcGridBaseAttrs.call(this);

		// Finding the blocks in the DOM
		_getGridBlocks.call(this);
		_checkForceMasonryPositions.call(this)

		// check full height
		_checkFullHeight.call(this);

		// Applying blocks separators
		_applyBlocksSeparators.call(this);

		// Calculations
		this.calcAllBlocksHeights();
		this.calcAllBlocksTops();

		_setGridHeight.call(this);

		instances.push(this);
	}

	/**
	 * Calculate grid widht and single width and height
	 * @return {void}
	 */
	function _calcGridBaseAttrs() {
		this.properties.gridWidth = this.element.offsetWidth; // Can cause a layout reflow
		this.properties.singleWidth = this.properties.gridWidth / this.options.columns;

		if ('fixed' === this.properties.layout) {
			this.properties.singleHeight = this.properties.singleWidth;
		} else if ('masonry' === this.properties.layout) {
			this.properties.singleHeight = 5;
		}

	}

	/**
	 * Check if there is a block with force masonry option, to make sure that blocks fit correctly empty spaces
	 * 
	 * @return {void}
	 * @since 2.2.0
	 */
	function _checkForceMasonryPositions() {
		this.properties.forceMasonryPositions = false
		// TODO: could add this check with a class on the grid
		if ('masonry' === this.properties.layout) return
		for (let i = 0; i < this.gridBlocksTotal; i++) {
			const blockCustomClasses = this.gridBlocks[i].blockData.getAttribute('data-block_custom_class')
			if (-1 !== blockCustomClasses.indexOf(this.REX_BLOCK_FORCE_MASONRY_CLASSNAME)) {
				this.properties.forceMasonryPositions = true
				break
			}
		}
	}

	function _checkFullHeight() {
		if (!this.properties.fullHeight) return
		var heightInUnits = _calculateGridHeight.call(this);
		var topSeparator = this.properties.gridTopSeparator - this.properties.halfSeparatorTop;
		var bottomSeparator = this.properties.gridBottomSeparator - this.properties.halfSeparatorBottom;

		if (0 !== heightInUnits) {
			this.properties.singleHeight =
				((globalViewportSize.height * this.properties.fullHeightScale) + this.properties.fullHeightOffset - (topSeparator + bottomSeparator)) /
				heightInUnits;
		}
	}

	function _getGridBlocks() {
		var blocksArray = Array.prototype.slice.call(this.element.getElementsByClassName('perfect-grid-item'));
		var blockInstance;

		var i = 0;

		for (i = 0; i < blocksArray.length; i++) {
			if (Utils.hasClass(blocksArray[i], 'rex-block--no-flow')) {
				this.noFlowBlocks.push(blocksArray[i])
				continue;
			}

			blockInstance = new RexBlock({
				el: blocksArray[i],
				id: blocksArray[i].getAttribute('data-rexbuilder-block-id'),
				w: parseInt(blocksArray[i].getAttribute('data-gs-width')),
				h: parseInt(blocksArray[i].getAttribute('data-gs-height')),
				x: parseInt(blocksArray[i].getAttribute('data-gs-x')),
				y: parseInt(blocksArray[i].getAttribute('data-gs-y')),
				hide: Utils.hasClass(blocksArray[i], 'rex-hide-element'),
				toCheck: false
			});

			_fixNaturalImage.call(this, blockInstance);

			this.gridBlocks.push(blockInstance);
		}

		this.gridBlocksTotal = this.gridBlocks.length;

		// Sort blocks array by ascending DOM order
		this.sortBlocks();

		// Getting grid id
		this.properties.id = this.element.dataset.rexGridId;
	}

	/**
	 * Calculate the height of the text content of a block.
	 * @param  {Element}  block		Grid block element
	 * @return {Number}       		Necessary text height
	 * @since	 1.0.0
	 */
	function _calculateTextWrapHeight(block) {
		var textWrap = block.querySelector('.text-wrap');
		var textHeight = 0;

		if (!textWrap) return textHeight;

		var blockHasSlider = Utils.hasClass(block, 'block-has-slider');
		var textWrapHasContent = 0 !== textWrap.textContent.trim().length;
		var textWrapHasChildren = 0 !== textWrap.childElementCount;

		if (!blockHasSlider && (textWrapHasContent || textWrapHasChildren)) {
			textHeight = textWrap.offsetHeight;
		}

		return textHeight;
	}

	/**
	 * Set the grid height in pixels
	 * @param {Array} info array of objects with the information to check; can be undefined
	 * @version 2.1.1 setting min height instead of height
	 */
	function _setGridHeight(info) {
		if (!this.properties.gridHeightSettable) return;

		var newGridHeight = _calculateGridHeight.call(this, info);

		this.element.style.minHeight = newGridHeight * this.properties.singleHeight + 'px';
	}

	/**
	 * Calculating grid DOM Element total height
	 * @param {Array} info array of objects with the information to check
	 * @return 	{Number}	Grid total height in unit
	 * @since		1.0.0
	 */
	function _calculateGridHeight(info) {
		info = 'undefined' !== typeof info ? info : this.gridBlocks;
		var heightTot = 0;
		var heightTemp;

		var i = 0;
		var tot = info.length;

		// for native loop guarantees more performance efficiency
		for (i = 0; i < tot; i++) {
			if (!info[i].hide) {
				heightTemp = info[i].h + info[i].y;
				if (heightTemp > heightTot) {
					heightTot = heightTemp;
				}
			}
		}

		return heightTot;
	}

	/**
	 * Get some properties of the grid, from the data attributes
	 * @return	{void}
	 * @since		1.0.0
	 */
	function _getGridAttributes() {
		if (this.sectionData.getAttribute('data-row_edited_live') != 'true') {
			/** @todo set to false on change layout ? */
			this.properties.editedFromBackend = true;
		}

		this.properties.layout = this.element.getAttribute('data-layout');
		this.properties.noMobileLayoutSaved = 'true' === this.sectionData.getAttribute('data-no-mobile-layout');
		this.properties.oneColumnModeActive = 'true' === this.sectionData.getAttribute('data-collapse-grid');
		this.properties.fullHeight = 'true' === this.element.getAttribute('data-full-height');

		// Defaults silently to 0 if the data attribute is not a number
		var fullHeightOffset = parseInt(this.element.dataset.fullHeightOffset);
		this.properties.fullHeightOffset = isNaN(fullHeightOffset) ? 0 : fullHeightOffset;

		// Defaults silently to 1 if the data attribute is not a number
		var fullHeightScale = parseFloat(this.element.dataset.fullHeightScale);
		this.properties.fullHeightScale = isNaN(fullHeightScale) ? 1 : fullHeightScale;
	}

	function _getDOMGutterOptions() {
		// Overriding blocks gutter value if there is the respective DOM Attribute
		if (this.element.getAttribute('data-separator')) {
			this.options.gutter = parseInt(this.element.getAttribute('data-separator'));
		}

		// Defining grid separators
		this.properties.gridTopSeparator = this.element.getAttribute('data-row-separator-top')
			? parseInt(this.element.getAttribute('data-row-separator-top'))
			: null;
		this.properties.gridRightSeparator = this.element.getAttribute('data-row-separator-right')
			? parseInt(this.element.getAttribute('data-row-separator-right'))
			: null;
		this.properties.gridBottomSeparator = this.element.getAttribute('data-row-separator-bottom')
			? parseInt(this.element.getAttribute('data-row-separator-bottom'))
			: null;
		this.properties.gridLeftSeparator = this.element.getAttribute('data-row-separator-left')
			? parseInt(this.element.getAttribute('data-row-separator-left'))
			: null;
	}

	/**
	 * Sets instance grid separators (gutters) properties.
	 * @return 	{void}
	 * @since   1.0.0
	 */
	function _setGridGutterProperties() {
		if (Utils.isEven(this.options.gutter)) {
			this.properties.halfSeparatorTop = this.options.gutter / 2;
			this.properties.halfSeparatorRight = this.options.gutter / 2;
			this.properties.halfSeparatorBottom = this.options.gutter / 2;
			this.properties.halfSeparatorLeft = this.options.gutter / 2;
		} else {
			this.properties.halfSeparatorTop = Math.floor(this.options.gutter / 2);
			this.properties.halfSeparatorRight = Math.floor(this.options.gutter / 2);
			this.properties.halfSeparatorBottom = Math.ceil(this.options.gutter / 2);
			this.properties.halfSeparatorLeft = Math.ceil(this.options.gutter / 2);
		}
	}

	/**
	 * Sets instance blocks separators (gutters) properties.
	 * Blocks properties are stored in RexGrid instance because
	 * they're equal for all blocks inside the grid.
	 * @return 	{void}
	 * @since   1.0.0
	 */
	function _setBlocksGutterProperties() {
		if (Utils.isEven(this.options.gutter)) {
			this.properties.halfSeparatorBlockTop = this.options.gutter / 2;
			this.properties.halfSeparatorBlockRight = this.options.gutter / 2;
			this.properties.halfSeparatorBlockBottom = this.options.gutter / 2;
			this.properties.halfSeparatorBlockLeft = this.options.gutter / 2;
		} else {
			this.properties.halfSeparatorBlockTop = Math.floor(this.options.gutter / 2);
			this.properties.halfSeparatorBlockRight = Math.floor(this.options.gutter / 2);
			this.properties.halfSeparatorBlockBottom = Math.ceil(this.options.gutter / 2);
			this.properties.halfSeparatorBlockLeft = Math.ceil(this.options.gutter / 2);
		}
	}

	/**
	 * Applies grid separators (paddings) on grid DOM Element.
	 * @return 	{void}
	 * @since		1.0.0
	 */
	function _applyGridSeparators() {
		if (
			!this.properties.setDesktopPadding ||
			(!this.properties.setDesktopPadding &&
				!this.properties.setMobilePadding &&
				this.section.getAttribute('data-rex-collapse-grid') == 'true')
		) {
			this.properties.setDesktopPadding = true;
			if (this.section.getAttribute('data-rex-collapse-grid') == 'true') {
				this.properties.setMobilePadding = true;
			} else {
				this.properties.setMobilePadding = false;
			}

			if (null !== this.properties.gridTopSeparator) {
				this.element.style.marginTop = this.properties.gridTopSeparator - this.properties.halfSeparatorTop + 'px';
			} else {
				this.element.style.marginTop = this.properties.halfSeparatorTop + 'px';
			}

			if (null !== this.properties.gridBottomSeparator) {
				this.element.style.marginBottom =
					this.properties.gridBottomSeparator - this.properties.halfSeparatorBottom + 'px';
			} else {
				this.element.style.marginBottom = this.properties.halfSeparatorBottom + 'px';
			}

			if (null !== this.properties.gridLeftSeparator) {
				this.element.style.marginLeft = this.properties.gridLeftSeparator - this.properties.halfSeparatorLeft + 'px';
			} else {
				this.element.style.marginLeft = this.properties.halfSeparatorLeft + 'px';
			}

			if (null !== this.properties.gridRightSeparator) {
				this.element.style.marginRight = this.properties.gridRightSeparator - this.properties.halfSeparatorRight + 'px';
			} else {
				this.element.style.marginRight = this.properties.halfSeparatorRight + 'px';
			}
		}
	}

	/**
	 * Applies blocks separators (gutters) on block content DOM Element.
	 * @return 	{void}
	 * @since		1.0.0
	 */
	function _applyBlocksSeparators() {
		var i = 0;
		var currentBlock;

		// for native loop guarantees more performance efficiency
		for (i = 0; i < this.gridBlocksTotal; i++) {
			currentBlock = this.gridBlocks[i].el.querySelector('.grid-stack-item-content');

			currentBlock.style.paddingTop = this.properties.halfSeparatorBlockTop + 'px';
			currentBlock.style.paddingRight = this.properties.halfSeparatorBlockRight + 'px';
			currentBlock.style.paddingBottom = this.properties.halfSeparatorBlockBottom + 'px';
			currentBlock.style.paddingLeft = this.properties.halfSeparatorBlockLeft + 'px';
		}
	}

	/**
	 * Fix blocks top positions for a fixed grid.
	 * @return 	{void}
	 * @since		1.0.0
	 */
	function _fixAllBlockPositionsFixed() {
		var i = 0;
		var j = 0;

		// check other blocks collapse
		for (i = 0; i < this.gridBlocksTotal; i++) {
			if (!this.gridBlocks[i].toCheck || this.gridBlocks[i].hide) {
				continue;
			}

			for (j = 0; j < this.gridBlocksTotal; j++) {
				if (this.gridBlocks[i].el === this.gridBlocks[j].el) {
					continue;
				}

				// @todo do we need a check to this this.gridBlocks[ J ].hide ?
				if (
					this.gridBlocks[i].x < this.gridBlocks[j].x + this.gridBlocks[j].w &&
					this.gridBlocks[i].x + this.gridBlocks[i].w > this.gridBlocks[j].x &&
					this.gridBlocks[i].y < this.gridBlocks[j].y + this.gridBlocks[j].h &&
					this.gridBlocks[i].y + this.gridBlocks[i].h > this.gridBlocks[j].y
				) {
					// Collision detected
					var newTop = this.gridBlocks[i].y + this.gridBlocks[i].h - this.gridBlocks[j].y;
					var newY = this.gridBlocks[j].y + newTop;

					this.gridBlocks[j].el.setAttribute('data-gs-y', newY);
					this.gridBlocks[j].blockData.setAttribute('data-gs-y', newY);

					if (this.gridBlocks[j].setTop) {
						this.gridBlocks[j].el.style.top = newY * this.properties.singleHeight + 'px';
					}
					this.gridBlocks[j].y = newY;
					this.gridBlocks[j].domIndex = this.gridBlocks[j].x + this.gridBlocks[j].y * this.options.columns;

					this.gridBlocks[j].toCheck = true;
				}
			}

			this.gridBlocks[i].toCheck = false;
		}
	}

	/**
	 * Fix blocks top positions for a masonry grid
	 * @return {void}
	 */
	function _fixAllBlockPositionsMasonry() {
		var i = 0;

		for (i = 0; i < this.gridBlocksTotal; i++) {
			this.gridBlocks[i].el.setAttribute('data-gs-y', 0);
			this.gridBlocks[i].blockData.setAttribute('data-gs-y', 0);

			if (this.gridBlocks[i].setTop) {
				this.gridBlocks[i].el.style.top = '0px';
			}
			this.gridBlocks[i].y = 0;
			this.gridBlocks[i].toCheck = true;
		}
	}

	/**
	 * Fix natural image with a proper class to style correctly
	 * the image in background as a natural image with IMG tag
	 * @param		{RexBlock}	gridBlockObj	RexBlock instance of the block
	 * 																		with the image to fix
	 * @return 	{void}
	 * @since 1.0.0
	 */
	function _fixNaturalImage(gridBlockObj) {
		var currentBlock = gridBlockObj.el;
		var naturalImage = currentBlock.querySelector('.natural-image-background');

		if (null === naturalImage) {
			return;
		}

		var itemContent = currentBlock.querySelector('.grid-item-content');

		if (null === itemContent) {
			console.warn('No .grid-item-content Element found in function fixNaturalImage!');
			return;
		}

		var naturalImageWidth = parseInt(itemContent.getAttribute('data-background_image_width'));
		var blockWidth = this.properties.singleWidth * gridBlockObj.w - this.options.gutter;

		if (naturalImageWidth > blockWidth) {
			Utils.addClass(naturalImage, 'small-width');
		}
	}

	function _updateBlockDataHeightProperties(blockData, newH) {
		if (this.properties.layout === 'masonry') {
			blockData.setAttribute('data-block_height_masonry', newH);
		} else {
			blockData.setAttribute('data-block_height_fixed', newH);
		}

		blockData.setAttribute('data-gs_height', newH);
		// blockData.setAttribute( 'data-gs_start_h', newH );
		blockData.setAttribute('data-block_height_calculated', newH);
	}

	/**
	 * Getting the block height based on content or background
	 * @param  {RexBlock} 		gridBlockObj
	 * @return {Number|null}	Passed block height
	 * @since	 1.0.0
	 */
	function _getBlockHeight(gridBlockObj) {
		var currentBlock = gridBlockObj.el;

		// Properties
		var blockData = gridBlockObj.blockData;
		var startH = gridBlockObj.start_h;

		var newH; // new height of the content block in pixels
		var newHUnits; // new height in twelfhs or 5 pixels
		var singleWidth = this.properties.singleWidth;

		var gutter = this.options.gutter;

		var originalWidth = gridBlockObj.w;
		var spaceAvailable = gridBlockObj.start_h * this.properties.singleHeight - gutter;
		var elRealFluid = parseInt(blockData.getAttribute('data-element_real_fluid'));

		var backgroundHeight = 0;
		var videoHeight = 0;
		var defaultHeight = 0;
		var sliderHeight = 0;
		var emptyBlockFlag = false;
		var backImgType = blockData.getAttribute('data-type_bg_block');
		var fitNaturalImg = Utils.hasClass(currentBlock, 'fit-natural-bg-image');

		var itemContent = currentBlock.querySelector('.grid-item-content');
		var imageWrapper = null;
		var blockHasSlider = false;
		var blockIsEmpty = false;
		var blockHasYoutube = false;
		var blockHasVideo = false;
		var blockHasVimeo = false;

		if (itemContent) {
			blockIsEmpty = -1 !== itemContent.className.indexOf('empty-content');

			imageWrapper = itemContent.querySelector('.rex-image-wrapper');

			blockHasSlider = -1 !== currentBlock.className.indexOf('block-has-slider');

			blockHasYoutube = -1 !== itemContent.className.indexOf('youtube-player');
			blockHasVideo = -1 !== itemContent.className.indexOf('mp4-player');
			blockHasVimeo = -1 !== itemContent.className.indexOf('vimeo-player');
		}

		const blockCustomClasses = blockData.getAttribute('data-block_custom_class')
		const isBlockMasonryForced = -1 !== blockCustomClasses.indexOf(this.REX_BLOCK_FORCE_MASONRY_CLASSNAME)

		// Prevents slider growing in height when resizing
		if (blockHasSlider) {
			return null;
		}

		var currentBlockTextHeight = _calculateTextWrapHeight.call(this, currentBlock);

		if (this.properties.oneColumnModeActive) {
			originalWidth = this.options.columns;
		}

		if (0 === currentBlockTextHeight) {
			// calculating background image height
			if (null !== imageWrapper) {
				var imageWidth = parseInt(itemContent.getAttribute('data-background_image_width'));
				var imageHeight = parseInt(itemContent.getAttribute('data-background_image_height'));

				var blockWidth = this.properties.singleWidth * gridBlockObj.w;

				if (fitNaturalImg) {
					backgroundHeight = (imageHeight * blockWidth) / imageWidth - gutter;
				} else {
					if (blockWidth < imageWidth) {
						backgroundHeight = (imageHeight * (originalWidth * singleWidth - gutter)) / imageWidth;
					} else {
						backgroundHeight = imageHeight;
					}
				}
			}

			// Calculate video height
			/** @todo check me to prevent video auto ratio-resize */
			if (blockHasYoutube || blockHasVideo || blockHasVimeo) {
				videoHeight = gridBlockObj.start_h * this.properties.singleHeight;
			}

			// Calculate slider height
			if (blockHasSlider) {
				sliderHeight = gridBlockObj.start_h * this.properties.singleHeight;
			}

			// calculate default height (in case of block without content that pushes)
			// or else update text height
			if (videoHeight == 0 && backgroundHeight == 0 && sliderHeight == 0 && (blockIsEmpty || blockHasSlider)) {
				if (this.properties.editedFromBackend && this.properties.layout == 'masonry') {
					defaultHeight = Math.round(singleWidth * startH);
				} else {
					defaultHeight = startH * this.properties.singleHeight;
				}
			}
		}

		if (!blockHasSlider && backgroundHeight == 0 && videoHeight == 0 && currentBlockTextHeight == 0) {
			emptyBlockFlag = true;
		}

		// if the block has a full image background, without text
		// maintain the old height
		if (
			!blockHasSlider &&
			!blockHasYoutube &&
			!blockHasVimeo &&
			!blockHasVideo &&
			(('full' === backImgType && 0 === currentBlockTextHeight) || ('' === backImgType && 0 === currentBlockTextHeight))
		) {
			newH = startH * this.properties.singleHeight - gutter;
		} else {
			startH = 0;

			newH = Math.max(startH, backgroundHeight, videoHeight, defaultHeight, currentBlockTextHeight, sliderHeight);
		}

		let resizeNeeded = true;
		var goToStartH = false;

		// check if resize really needed
		// fix occurs on first start and not in editor mode
		if (0 !== currentBlockTextHeight) {
			if ('fixed' === this.properties.layout || (1 !== elRealFluid && 'masonry' === this.properties.layout)) {
				if (newH <= spaceAvailable) {
					if (gridBlockObj.h > gridBlockObj.start_h) {
						// go back to initial height
						goToStartH = true;
					} else {
						resizeNeeded = false;
					}
				}
			}
		} else if (0 !== backgroundHeight) {
			if ('fixed' === this.properties.layout) {
				resizeNeeded = false;
			} else if ('masonry' === this.properties.layout) {
				if (('natural' === backImgType && 1 !== elRealFluid) || 'full' === backImgType) {
					if (newH <= spaceAvailable) {
						resizeNeeded = false;
					}
				}
			}
		} else if (0 !== videoHeight) {
			if ('masonry' === this.properties.layout) {
				resizeNeeded = false;
			}
		}

		if (goToStartH) {
			return gridBlockObj.start_h;
		}

		if (isBlockMasonryForced) {
			resizeNeeded = true
		}

		if (!resizeNeeded) {
			return null;
		}

		if (this.properties.layout == 'fixed') {
			if (emptyBlockFlag || blockHasYoutube || blockHasVideo || blockHasVimeo) {
				newHUnits = Math.round((newH + gutter) / this.properties.singleHeight);
			} else {
				newHUnits = Math.ceil((newH + gutter) / this.properties.singleHeight);
			}
		} else {
			newHUnits = Math.ceil((newH + gutter) / this.properties.singleHeight);
		}

		return newHUnits;
	}

	/**
	 * Calculate single block height, based on the assume that is a collapse
	 * and that the block properties are not defined for the collapse (no mobile layout saved).
	 * @param  {RexBlock} gridBlockObj 	Block to get the dimension
	 * @return {Number}      						Height of the collapsed block
	 * @since	 1.0.0
	 */
	function _getBlockHeightOnCollapse(gridBlockObj) {
		var currentBlock = gridBlockObj.el;

		var elemData = currentBlock.querySelector('.rexbuilder-block-data');
		var textWrap = currentBlock.querySelector('.text-wrap');
		var imgWrap = currentBlock.querySelector('.rex-image-wrapper');
		var itemContent = currentBlock.querySelector('.grid-item-content');

		var blockHasSlider = -1 !== currentBlock.className.indexOf('block-has-slider');
		// var blockIsEmpty = -1 !== itemContent.className.indexOf( 'empty-content' );
		var blockHasYoutube = -1 !== itemContent.className.indexOf('youtube-player');
		var blockHasVideo =
			0 !== [].slice.call(currentBlock.getElementsByClassName('rex-video-wrap')).length ? true : false;
		var blockHasVimeo = -1 !== itemContent.className.indexOf('vimeo-player');

		// var elRealFluid = parseInt( elemData.getAttribute( 'data-element_real_fluid' ) );
		// var backImgType = elemData.getAttribute( 'data-type_bg_block' );
		var newH = 0;
		var hasText = false;
		var spaceNeeded = null;

		// calc the new height, based on the old height props
		var spaceAvailable = gridBlockObj.h * this.properties.singleHeight;
		newH = Math.round(spaceAvailable / this.properties.singleHeight);

		// check height if the block has text
		if (textWrap) {
			var textHeight = _calculateTextWrapHeight.call(this, gridBlockObj.el);

			hasText = 0 !== textHeight;
			spaceNeeded = textHeight + this.options.gutter;
		}

		// check height if is a masonry grid, with a natural image, without text
		if (!hasText && imgWrap) {
			var imgWidth = parseInt(itemContent.getAttribute('data-background_image_width'));
			var imgHeight = parseInt(itemContent.getAttribute('data-background_image_height'));
			var imageWrapperWidth = this.properties.singleWidth * gridBlockObj.w - this.options.gutter;

			if (imageWrapperWidth < imgWidth) {
				spaceNeeded = (imgHeight * (gridBlockObj.w * this.properties.singleWidth - this.options.gutter)) / imgWidth;
				Utils.addClass(imgWrap, 'small-width');
			} else {
				spaceNeeded = imgHeight + this.options.gutter;
				Utils.removeClass(imgWrap, 'small-width');
			}
		}

		var defaultRatio = 3 / 4;

		if (!hasText && (blockHasYoutube || blockHasVideo || blockHasVimeo)) {
			spaceNeeded = Math.round(gridBlockObj.w * this.properties.singleWidth * defaultRatio);
		}

		// calculate slider height
		var sliderRatio = parseFloat(elemData.getAttribute('data-slider_ratio'));
		if (blockHasSlider && !isNaN(sliderRatio)) {
			if (!isNaN(sliderRatio)) {
				spaceNeeded = gridBlockObj.w * this.properties.singleWidth * sliderRatio;
			} else {
				spaceNeeded = gridBlockObj.w * this.properties.singleWidth * defaultRatio;
			}
		}

		// on collapse the height need to reflect the contents height
		newH = Math.round(spaceNeeded / this.properties.singleHeight);

		return newH;
	}

	/**
	 * Reset grid blocks array, no flow blocks array and grid blocks total props
	 * @since 2.1.1
	 */
	function _resetBlocksProps() {
		this.gridBlocksTotal = 0
		this.gridBlocks = []
		this.noFlowBlocks = []
	}

	/**
	 * Reset no flow blocks style properties set by grid
	 * @since 2.1.1
	 */
	function _resetNoFlowBlocks() {
		for (let i = 0; i < this.noFlowBlocks.length; i++) {
			const itemContent = this.noFlowBlocks[i].querySelector('.grid-stack-item-content');
			itemContent.style.padding = ''
			this.noFlowBlocks[i].style.height = ''
			this.noFlowBlocks[i].style.top = ''
			this.noFlowBlocks[i].style.left = ''
		}
	}
	/**
	 *
	 * @param  {[type]} toMaintainCoords [description]
	 * @return {[type]}                  [description]
	 */
	function calcFilteredGrid(toMaintainCoords) {
		if (0 === toMaintainCoords.length) {
			return;
		}

		var idx = new IndexedGrid(this.options.columns);
		toMaintainCoords[0].x = 0;
		toMaintainCoords[0].y = 0;
		idx.setGrid(0, 0, toMaintainCoords[0].w, toMaintainCoords[0].h);
		var idx_pos;
		var idx_cords;
		for (i = 1; i < toMaintainCoords.length; i++) {
			idx_pos = idx.willFit(toMaintainCoords[i].w, toMaintainCoords[i].h);
			if (idx_pos) {
				idx_cords = Utils.getCoord(idx_pos, this.options.columns);
				idx.setGrid(idx_cords.x, idx_cords.y, toMaintainCoords[i].w, toMaintainCoords[i].h);
				toMaintainCoords[i].x = idx_cords.x;
				toMaintainCoords[i].y = idx_cords.y;
			}
		}
	}

	/**
	 * Emit custom event on rex grid element
	 * @param {String} name event name
	 * @param {Object} data event data, optional
	 * @since 2.0.10
	 */
	 function _emiEvent(name, data) {
		data = 'undefined' === typeof data ? null : data
		if (window.CustomEvent && typeof window.CustomEvent === 'function') {
			var event = new CustomEvent(name, {detail: data});
		} else {
			var event = document.createEvent('CustomEvent');
			event.initCustomEvent(name, true, true, data);
		}

		this.element.dispatchEvent(event);
	}

	/* ===== Public Methods ===== */

	RexGrid.prototype.isMasonry = function () {
		return 'masonry' === this.properties.layout;
	};

	RexGrid.prototype.isFixed = function () {
		return 'fixed' === this.properties.layout;
	};

	/**
	 * Calculating height of the grid blocks.
	 * @since	1.0.0
	 */
	RexGrid.prototype.calcAllBlocksHeights = function () {
		var i = 0;

		// for native loop guarantees more performance efficiency
		for (i = 0; i < this.gridBlocksTotal; i++) {
			if (!this.gridBlocks[i].setHeight) continue
			this.calcAndSetBlockHeight(this.gridBlocks[i]);
		}
	};

	RexGrid.prototype.calcAndSetBlockHeight = function (gridBlockObj) {
		gridBlockObj.el.style.height = this.properties.singleHeight * gridBlockObj.h + 'px';
	};

	RexGrid.prototype.fixAllBlocksHeights = function () {
		var i = 0;

		// for native loop guarantees more performance efficiency
		for (i = 0; i < this.gridBlocksTotal; i++) {
			if (this.gridBlocks[i].hide) continue
			this.fixBlockHeight(this.gridBlocks[i]);
		}
	};

	/**
	 * Fix the height of a block, according to the builder contents rules
	 * @param  {RexBlock} gridBlockObj RexBlock instance
	 * @return {void}
	 * @since  1.0.0
	 */
	RexGrid.prototype.fixBlockHeight = function (gridBlockObj) {
		var newH;

		if (this.properties.oneColumnModeActive) {
			newH = _getBlockHeightOnCollapse.call(this, gridBlockObj);
		} else {
			newH = _getBlockHeight.call(this, gridBlockObj);
		}

		gridBlockObj.toCheck = true;

		if (null === newH || isNaN(newH)) {
			return;
		}

		_updateBlockDataHeightProperties.call(this, gridBlockObj.blockData, newH);

		// Setting dimensions
		_setBlockDimensions.call(this, gridBlockObj, newH);
	};

	function _setBlockDimensions(gridBlockObj, newH) {
		gridBlockObj.h = newH;
		if (gridBlockObj.setHeight) {
			gridBlockObj.el.style.height = gridBlockObj.h * this.properties.singleHeight + 'px';
		}

		gridBlockObj.el.setAttribute('data-gs-height', gridBlockObj.h);
		gridBlockObj.el.setAttribute('data-height', gridBlockObj.h);
		gridBlockObj.toCheck = true;
	}


	/**
	 * Fixing the block positions according to heights
	 * @return 	{void}
	 * @since		1.0.0
	 */
	RexGrid.prototype.fixAllBlockPositions = function () {
		switch (true) {
			case ('masonry' === this.properties.layout || this.properties.forceMasonryPositions):
				// If layout is masonry we set all the y and x to 0,
				// then the normal collision detection function is called
				_fixAllBlockPositionsMasonry.call(this);
			default:
				_fixAllBlockPositionsFixed.call(this);
				break;
		}
	};

	/**
	 * Calculating top of the grid blocks.
	 * @return 	{void}
	 * @since		1.0.0
	 */
	RexGrid.prototype.calcAllBlocksTops = function () {
		var i = 0;

		var currentBlock;
		var currentBlockRealTop = 0;

		// for native loop guarantees more performance efficiency
		for (i = 0; i < this.gridBlocksTotal; i++) {
			currentBlock = this.gridBlocks[i].el;
			if ('fixed' === this.properties.layout) {
				// go back to initial block Y to prevent unwanted empty spaces
				// between blocks
				this.gridBlocks[i].y = this.gridBlocks[i].start_y;
			}

			if (this.gridBlocks[i].setTop) {
				currentBlockRealTop = this.properties.singleHeight * this.gridBlocks[i].y;
				currentBlock.style.top = currentBlockRealTop + 'px';
			}
		}
	};

	/**
	 * Fixing of heights and positions that are necessary after
	 * the 'load' Event has fired.
	 * @return 	{void}
	 * @since		1.0.0
	 * @todo 		Change name?
	 */
	RexGrid.prototype.fixAfterLoad = function () {
		// Fixings
		this.fixAllBlocksHeights();
		this.fixAllBlockPositions();

		_setGridHeight.call(this);
	};

	/**
	 * Update RexBlocks information reading from DOM attributes.
	 * @return {void}
	 * @since  1.0.0
	 */
	RexGrid.prototype.updateGridBlocks = function () {
		var i = 0;

		for (i = 0; i < this.gridBlocksTotal; i++) {
			this.gridBlocks[i].refreshProperties();
		}
	};

	/**
	 * Sorts blocks. Order based on block DOM Index,
	 * so it has to be properly updated before calling
	 * this function.
	 * @return 	{void}
	 * @since		1.0.0
	 */
	RexGrid.prototype.sortBlocks = function () {
		this.gridBlocks.sort(function (blockA, blockB) {
			return blockA.domIndex - blockB.domIndex;
		});
	};

	/**
	 * Fix the grid after change layout
	 * @return {void}
	 */
	RexGrid.prototype.endChangeLayout = function () {
		// reset blocks instance properties
		_resetBlocksProps.call(this)

		// on change layout, get the blocks
		_getGridBlocks.call(this)
		_checkForceMasonryPositions.call(this)

		// remove block properties from eventually no flow blocks
		_resetNoFlowBlocks.call(this)

		// get new grid props
		_getGridAttributes.call(this);

		// Getting gutters from DOM attributes
		_getDOMGutterOptions.call(this);

		// Setting instance properties
		_setGridGutterProperties.call(this);
		_setBlocksGutterProperties.call(this);

		this.properties.setDesktopPadding = false;

		// Applying grid separators
		_applyGridSeparators.call(this);

		// check full height
		_checkFullHeight.call(this);

		// Applying blocks separators
		_applyBlocksSeparators.call(this);

		/**
		 * Only if there isn't a mobile layout saved, re-order gridBlocks array
		 * with the DOM order, to correctly order the elements
		 */
		if (this.properties.noMobileLayoutSaved) {
			var domBlocks = Array.prototype.slice.call(this.element.getElementsByClassName('perfect-grid-item'));
			var i,
				tot_domBlocks = domBlocks.length,
				j;
			var temp = [];

			for (i = 0; i < tot_domBlocks; i++) {
				for (j = 0; j < this.gridBlocksTotal; j++) {
					if (domBlocks[i] === this.gridBlocks[j].el) {
						temp[i] = this.gridBlocks[j];
					}
				}
			}

			this.gridBlocks = temp;
		}

		// Fix blocks properties
		this.updateGridBlocks();

		// Sorting blocks based on real order
		// Needed because there could be blocks in different
		// orders when changing layout
		this.sortBlocks();
	};

	/**
	 * Fix the grid after a resize
	 * @return {void}
	 * @since	 1.0.0
	 * @todo	 Change name?
	 */
	RexGrid.prototype.endResize = function () {
		// Update grid width, single height and single width
		_calcGridBaseAttrs.call(this);

		// check full height
		_checkFullHeight.call(this);

		if (!this.isFiltered()) {
			if ('*' === this.properties.filterRule) {
				for (var i = 0; i < this.gridBlocksTotal; i++) {
					this.gridBlocks[i].el.style.left = '';
				}
			}

			// Calculations
			// recalc height because on resize single height can change
			this.calcAllBlocksHeights();
			this.calcAllBlocksTops();

			// Fixings
			this.fixAllBlocksHeights();
			this.fixAllBlockPositions();

			_setGridHeight.call(this);
		} else {
			this.calcAllBlocksHeights();

			this.fixAllBlocksHeights();
			this.fixAllBlockPositions();

			for (var i = 0; i < this.gridBlocksTotal; i++) {
				for (var j = 0; j < this.properties.filterCoords.length; j++) {
					if (this.properties.filterCoords[j].el === this.gridBlocks[i].el) {
						this.properties.filterCoords[j].w = this.gridBlocks[i].w;
						this.properties.filterCoords[j].h = this.gridBlocks[i].h;
						this.properties.filterCoords[j].x = this.gridBlocks[i].x;
						this.properties.filterCoords[j].y = this.gridBlocks[i].y;
						break;
					}
				}
			}

			// for the filters, i can use filterCoords
			calcFilteredGrid.call(this, this.properties.filterCoords);

			for (var i = 0; i < this.properties.filterCoords.length; i++) {
				this.properties.filterCoords[i].el.style.left =
					this.properties.filterCoords[i].x * this.properties.singleWidth + 'px';
				this.properties.filterCoords[i].el.style.top =
					this.properties.filterCoords[i].y * this.properties.singleHeight + 'px';
			}

			_setGridHeight.call(this, this.properties.filterCoords);
		}
	};

	RexGrid.prototype.getRexBlockInstance = function (block) {
		var i = 0;

		for (i = 0; i < this.gridBlocksTotal; i++) {
			if (block === this.gridBlocks[i].el) {
				return this.gridBlocks[i];
			}
		}

		return null;
	};

	RexGrid.prototype.reCalcBlockHeight = function (block) {
		var gridBlockObj = this.getRexBlockInstance(block);
		var textWrapHeight = _calculateTextWrapHeight.call(this, block);
		var unitHeight = Math.ceil((textWrapHeight + this.options.gutter) / this.properties.singleHeight);

		// Updating DOM Attributes
		_updateBlockDataHeightProperties.call(this, gridBlockObj.blockData, unitHeight);

		// Setting dimensions
		_setBlockDimensions.call(this, gridBlockObj, unitHeight);

		this.fixAllBlockPositions();

		_setGridHeight.call(this);
	};

	/**
	 * The grid is filterable?
	 * @return {Boolean} true if the grid is filterable
	 */
	RexGrid.prototype.isFiltered = function () {
		return 'string' === typeof this.properties.filterRule && '*' !== this.properties.filterRule;
	};

	/**
	 * Filter the grid elements by a certain rule
	 * @param  {String} rule class to filter
	 */
	RexGrid.prototype.filter = function (rule) {
		var i;
		var toMaintain = [];
		var toMaintainCoords = [];
		var toRemove = [];

		this.properties.filterRule = rule;

		// get all elements
		if ('*' == rule) {
			for (i = 0; i < this.gridBlocksTotal; i++) {
				toMaintain.push(this.gridBlocks[i].el);
				toMaintainCoords.push({
					x: this.gridBlocks[i].x,
					y: this.gridBlocks[i].y,
					w: this.gridBlocks[i].w,
					h: this.gridBlocks[i].h
				});
				this.gridBlocks[i].hide = false;
			}
		} else {
			// filter by a rule
			for (i = 0; i < this.gridBlocksTotal; i++) {
				if (Utils.hasClass(this.gridBlocks[i].el, rule)) {
					toMaintain.push(this.gridBlocks[i].el);
					toMaintainCoords.push({
						el: this.gridBlocks[i].el,
						x: 0,
						y: 0,
						w: this.gridBlocks[i].w,
						h: this.gridBlocks[i].h
					});
					this.gridBlocks[i].hide = false;
				} else {
					this.gridBlocks[i].hide = true;
					toRemove.push(this.gridBlocks[i].el);
				}
			}
		}

		// simulate grid and calc positions
		calcFilteredGrid.call(this, toMaintainCoords);

		this.properties.filterCoords = toMaintainCoords;

		var that = this;
		var timeline = anime.timeline({
			duration: 200,
			easing: 'easeInOutQuad',
			begin: function (anim) {
				// handle filter click here
			},
			complete: function (anim) {
				// animation complete
				_setGridHeight.call(that, toMaintainCoords);
				_emiEvent.call(that, 'rex-grid-filter-end');
			}
		});

		timeline
			.add({
				targets: toMaintain,
				scale: 1,
				opacity: 1,
				left: function (target, index) {
					// target.setAttribute('data-gs-x', toMaintainCoords[index].x);
					return toMaintainCoords[index].x * that.properties.singleWidth + 'px';
				},
				top: function (target, index) {
					return toMaintainCoords[index].y * that.properties.singleHeight + 'px';
				},
				begin: function (anim) {
					anim.animatables.forEach(function (el) {
						Utils.removeClass(el.target, 'rex-block--filtered');
					});
				}
			})
			.add(
				{
					targets: toRemove,
					scale: 0,
					opacity: 0,
					complete: function (anim) {
						anim.animatables.forEach(function (el) {
							Utils.addClass(el.target, 'rex-block--filtered');
						});
					}
				},
				'-=200'
			);
	};

	/**
	 * Add an element to the grid
	 * @param	{HTMLElement}	el
	 * @param	{number}			w
	 * @param	{number}			h
	 * @param	{number}			x
	 * @param	{number}			y
	 * @since	2.0.4
	 */
	RexGrid.prototype.addGridBlock = function (el, w, h, x, y) {
		// get attributes for the new block
		// if necessary synchronize them with the data attributes
		if ('undefined' !== typeof w) {
			w = parseInt(w);
			el.setAttribute('data-gs-width', w);
		} else {
			w = parseInt(el.getAttribute('data-gs-width'));
		}

		if ('undefined' !== typeof h) {
			h = parseInt(h);
			el.setAttribute('data-gs-height', h);
		} else {
			h = parseInt(el.getAttribute('data-gs-height'));
		}

		if ('undefined' !== typeof x) {
			x = parseInt(x);
			el.setAttribute('data-gs-x', x);
		} else {
			x = parseInt(el.getAttribute('data-gs-x'));
		}

		if ('undefined' !== typeof y) {
			y = parseInt(y);
			el.setAttribute('data-gs-y', y);
		} else {
			y = parseInt(el.getAttribute('data-gs-y'));
		}

		// fix block data
		var blockData = el.querySelector('.rexbuilder-block-data');
		blockData.setAttribute('data-gs_width', w);
		blockData.setAttribute('data-gs_height', h);
		blockData.setAttribute('data-gs_x', x);
		blockData.setAttribute('data-gs_y', y);
		blockData.setAttribute('data-gs_start_h', h);

		// create the RexBlock instance
		var blockInstance = new RexBlock({
			el: el,
			id: el.getAttribute('data-rexbuilder-block-id'),
			w: w,
			h: h,
			x: x,
			y: y,
			hide: Utils.hasClass(el, 'rex-hide-element'),
			toCheck: false
		});

		// setting the gutter
		var itemContent = el.querySelector('.grid-stack-item-content');
		itemContent.style.paddingTop = this.properties.halfSeparatorBlockTop + 'px';
		itemContent.style.paddingRight = this.properties.halfSeparatorBlockRight + 'px';
		itemContent.style.paddingBottom = this.properties.halfSeparatorBlockBottom + 'px';
		itemContent.style.paddingLeft = this.properties.halfSeparatorBlockLeft + 'px';

		this.gridBlocks.push(blockInstance);
		this.gridBlocksTotal = this.gridBlocks.length;
	};

	/**
	 * @param {Array<HTMLElement>}	blocks
	 * @param {Array<object>}				layoutData
	 */
	RexGrid.prototype.addGridBlocksAccordingToLayoutData = function (blocks, layoutData) {
		if (!Array.isArray(blocks)) {
			// If passing a querySelectorAll or getElementsByClassName result
			blocks = Array.prototype.slice.call(blocks);
		}

		if (!Array.isArray(layoutData)) {
			throw new Error('Layout data passed is not an array!');
		}

		for (var i = 0; i < blocks.length; i++) {
			var currentBlock = blocks[i];
			var currentID = currentBlock.getAttribute('data-rexbuilder-block-id');

			var currentBlockLayoutData = layoutData.filter(function (archiveLayoutEntry) {
				return currentID === archiveLayoutEntry.name;
			});

			currentBlockLayoutData = currentBlockLayoutData[0];

			var hasProps = currentBlockLayoutData.props.length !== 0;

			// if(!hasProps) continue;

			if (currentBlockLayoutData) {
				this.addGridBlock(
					currentBlock,
					currentBlockLayoutData.props.gs_width,
					currentBlockLayoutData.props.gs_height,
					currentBlockLayoutData.props.gs_x,
					currentBlockLayoutData.props.gs_y
				);
			} else {
				throw new Error('Block with ID ' + currentID + ' is not in the archive data!');
			}
		}
	};

	/**
	 * Remove a block from the grid.
	 *
	 * @param	{HTMLElement}	block
	 * @param	{object}			[options]
	 * @param	{boolean}			[options.removeFromDOM]
	 */
	RexGrid.prototype.removeGridBlock = function (block, options) {
		options = 'undefined' !== typeof options ? options : { removeFromDOM: true };

		var found = null;

		for (var i = 0; i < this.gridBlocksTotal; i++) {
			if (this.gridBlocks[i].el === block) {
				found = i;
				break;
			}
		}

		if (null === found) return;

		if (options.removeFromDOM) {
			this.gridBlocks[found].el.parentNode.removeChild(this.gridBlocks[found].el);
		}

		this.gridBlocks.splice(found, 1);
		this.gridBlocksTotal = this.gridBlocks.length;
	};

	/**
	 * Remove an array of blocks from the grid.
	 * RexGrid.prototype.removeGridBlock's simple wrapper for multiple blocks.
	 *
	 * @param	{Array<HTMLElement>}	blocks
	 * @param	{object}							[options]
	 * @param	{boolean}							[options.removeFromDOM]
	 */
	RexGrid.prototype.removeGridBlocks = function (blocks, options) {
		if (!Array.isArray(blocks)) {
			blocks = Array.prototype.slice.call(blocks);
		}

		var removeGridBlock = this.removeGridBlock.bind(this);

		blocks.forEach(function (block) {
			removeGridBlock(block, options);
		});
	};

	/**
	 * Remove all elements from the grid
	 * @return {void}
	 * @todo  remove elements from DOM
	 */
	RexGrid.prototype.removeAllGridBlocks = function () {
		var i;
		for (i = 0; i < this.gridBlocksTotal; i++) {
			if (this.gridBlocks[i].el.parentNode) {
				this.gridBlocks[i].el.parentNode.removeChild(this.gridBlocks[i].el);
			}
		}

		this.gridBlocks = [];
		this.gridBlocksTotal = 0;
	};

	/**
	 * Destroy a RexGrid instance destroying all instance RexBlocks
	 * @return 	{void}
	 * @since		1.0.0
	 * @version 2.1.1 	reset min height
	 */
	RexGrid.prototype.destroy = function () {
		this.element.style.minHeight = '';

		// RexBlocks
		var i;
		for (i = 0; i < this.gridBlocksTotal; i++) {
			this.gridBlocks[i].destroy();
		}

		function removeInstance(instance) {
			return instance.element !== this.element;
		}

		instances = instances.filter(removeInstance.bind(this));
	};

	/**
	 * Set both the data-full-height-offset attribute in the grid and the RexGrid instance property.
	 * @param	{Number}	newOffset		(can be a String, it will be cast)
	 * @since	1.0.1
	 */
	RexGrid.prototype.setFullHeightOffset = function (newOffset) {
		if (!newOffset) {
			console.error('An offset must be passed!');
			return;
		}

		if ('string' === typeof newOffset) {
			newOffset = parseInt(newOffset);
		}

		if ('number' !== typeof newOffset || isNaN(newOffset)) {
			console.error('The offset passed must be either a String or a Number');
			return;
		}

		this.element.dataset.fullHeightOffset = newOffset;
		this.properties.fullHeightOffset = newOffset;
	};

	/**
	 * Destroys all RexGrid instances.
	 * @returns	{void}
	 * @since		1.0.0
	 */
	RexGrid.destroyAll = function () {
		instances.forEach(function (instance) {
			instance.destroy();
		});
	};

	/**
	 * Function to grab an instance of the RexGrid based from an element
	 * @param  {Element} el dom element
	 * @return {RexGrid}    instance of RexGrid
	 */
	RexGrid.data = function (el) {
		var i = 0,
			tot = instances.length;
		for (i = 0; i < tot; i++) {
			if (el === instances[i].element) {
				return instances[i];
			}
		}

		return null;
	};

	/**
	 * Function to programmatically update the viewport size information
	 * @return {void}
	 * @since  2.0.4
	 */
	RexGrid.updateViewportSize = function () {
		globalViewportSize = Utils.viewport();
	};

	return RexGrid;
});

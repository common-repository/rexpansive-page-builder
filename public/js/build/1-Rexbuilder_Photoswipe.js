var Rexbuilder_Photoswipe = (function($){
	"use strict";

	var gallerySelectorGlobal = '';

	var init_inline_pswp = function(e) {
		var initiator = e.target;
		var data_items = initiator.getAttribute('data-inline-pswp-info');

		if( 'undefined' !== typeof data_items && "" !== data_items ) {

			var pswpElement = document.querySelectorAll('.pswp')[0];
			var disableAnimation = false;

			// build items array
			var items = JSON.parse(data_items);

			var options = {
				// define gallery index (for URL)
				galleryUID: initiator.getAttribute('data-pswp-uid'),

				closeOnScroll: false,
				showHideOpacity: true
			};

			if (disableAnimation) {
				options.showAnimationDuration = 0;
			}

			var gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options);
			gallery.init();
		}
	};

	var _addElement = function($itemContent, url, w, h, t) {
		if ( !$itemContent.parents('.grid-stack-item').hasClass('block-has-slider') ) {
			tmpl.arg = "image";
			var $gridstackItemContent = $itemContent.parents(".grid-stack-item-content");
			if ($itemContent.parents(".pswp-figure").length == 0) {
				$itemContent.parent().prepend(
					tmpl("tmpl-photoswipe-block", {
						link: url,
						width: w,
						height: h,
						type: t
					})
				);
				var $pspwItem = $gridstackItemContent.find(".pswp-item");
				$itemContent.detach().appendTo($pspwItem);
			}
		}
	};

	var _addElementFromInline = function($img) {
		/*Setting photoswipe*/

		// selects the alignment of the image
		var classes = $img.attr("class")
		var align = 'alignone'
		if ('undefined' !== typeof classes) {
			align = $img.attr("class").split(' ')[1];
		}

		tmpl.arg = "image";
		$img.before(tmpl("tmpl-photoswipe-block-inline", {
			link: $img.attr("src"),
			width: $img.css("width"),
			height: $img.css("height"),
			type: "natural",
			align: align
			})
		);

		var $pswpItems = $img.parents(".text-wrap").find(".pswp-item");
		var $pswpItemWithoutImage = $pswpItems.filter(function(index){
			return $(this).children().length == 3;
		});

		$img.detach().appendTo($pswpItemWithoutImage);
	};

	var _removeElement = function($itemContent) {
		var $pswpFigure = $itemContent.parents(".pswp-figure");
		if ($pswpFigure.length != 0) {
			var $pspwParent = $pswpFigure.parent();
			$itemContent.detach().appendTo($pspwParent);
			$pswpFigure.remove();
		}
	};

	var _removeElementFromInline = function($img) {
		var $pswpFigure = $img.parents(".pswp-figure");

		$img.detach().insertBefore($pswpFigure);
		$pswpFigure.remove();
	}

	// parse slide data (url, title, size ...) from DOM elements
	// (children of gallerySelector)
	var parseThumbnailElements = function(el) {
		var thumbElements = $(el).find(".pswp-figure").get();

		var numNodes = thumbElements.length,
			items = [],
			figureEl,
			linkEl,
			size,
			item;

		for (var i = 0; i < numNodes; i++) {
			figureEl = thumbElements[i]; // <figure> element

			// include only element nodes
			if (figureEl.nodeType !== 1) {
				continue;
			}

			linkEl = figureEl.children[0]; // <a> element

			size = linkEl.getAttribute("data-size").replace("px", "").split("x");

			// create slide object
			item = {
				src: linkEl.getAttribute("href"),
				w: parseInt(size[0], 10),
				h: parseInt(size[1], 10)
			};

			if (figureEl.children.length > 1) {
				// <figcaption> content
				item.title = figureEl.children[1].innerHTML;
			}

			if (linkEl.children.length > 0) {
				// <img> thumbnail element, retrieving thumbnail url
				item.msrc = linkEl.children[0].getAttribute("data-thumburl");
			}

			// Unique identifier for URLs
			item.pid = i;

			item.el = figureEl; // save link to element for getThumbBoundsFn
			items.push(item);
		}

		return items;
	};

	// find nearest parent element
	var closest = function closest(el, fn) {
		return el && (fn(el) ? el : closest(el.parentNode, fn));
	};

	var collectionHas = function(a, b) {
		//helper function (see below)
		for (var i = 0, len = a.length; i < len; i++) {
			if (a[i] == b) return true;
		}
		return false;
	};

	var findParentBySelector = function(elm, selector) {
		var all = document.querySelectorAll(selector);
		var cur = elm.parentNode;
		while (cur && !collectionHas(all, cur)) {
			//keep going up until you find a match
			cur = cur.parentNode; //go up
		}
		return cur; //will return null if not found
	};

	// triggers when user clicks on thumbnail
	var onThumbnailsClick = function(e) {
		e = e || window.event;

		// Bug fix for Block links and links inside blocks
		if (
			$(e.target)
				.parents(".perfect-grid-item")
				.find(".element-link").length > 0 ||
				'a' === e.target.tagName.toUpperCase()
			) {
			return;
		}

		var eTarget = e.target;

		// find root element of slide
		var clickedListItem = closest(eTarget, function(el) {
			return el.tagName && el.tagName.toUpperCase() === "FIGURE";
		});

		if ( !clickedListItem) {
			return;
		}

		// prevent default click, if we found a correct pswp item
		e.preventDefault ? e.preventDefault() : (e.returnValue = false);

		// find index of clicked item by looping through all child nodes
		// alternatively, you may define index via data- attribute
		// var clickedGallery = clickedListItem.parentNode,
		//var clickedGallery = findParentBySelector(clickedListItem, '.my-gallery'),
		var clickedGallery = $(clickedListItem).parents(gallerySelectorGlobal)[0];
		//childNodes = clickedListItem.parentNode.childNodes,
		var childNodes = Array.prototype.slice.call( clickedGallery.getElementsByClassName('pswp-figure'))
		// var childNodes = $(clickedGallery)
		// 	.find(".pswp-figure")
		// 	.get(),
		var numChildNodes = childNodes.length,
			nodeIndex = 0,
			index;

		for (var i = 0; i < numChildNodes; i++) {
			if (childNodes[i].nodeType !== 1) {
				continue;
			}

			if (childNodes[i] === clickedListItem) {
				index = nodeIndex;
				break;
			}
			nodeIndex++;
		}

		if (index >= 0) {
			// open PhotoSwipe if valid index found
			openPhotoSwipe(index, clickedGallery);
		}

		return false;
	};

	// parse picture index and gallery index from URL (#&pid=1&gid=2)
	var photoswipeParseHash = function() {
		var hash = window.location.hash.substring(1),
			params = {};

		if (hash.length < 5) {
			return params;
		}

		var vars = hash.split("&");
		for (var i = 0; i < vars.length; i++) {
			if (!vars[i]) {
				continue;
			}
			var pair = vars[i].split("=");
			if (pair.length < 2) {
				continue;
			}
			params[pair[0]] = pair[1];
		}

		if (params.gid) {
			params.gid = parseInt(params.gid, 10);
		}

		return params;
	};

	var onOpenPhotoswipeInsideIframe = function() {
		var data = {
			eventName: "popUpContent:pswpOpened",
		};

		Rexbuilder_Util_Editor.sendParentIframeMessage( data );
	}

	var onClosePhotoswipeInsideIframe = function() {
		var data = {
			eventName: "popUpContent:pswpClosed",
		};

		Rexbuilder_Util_Editor.sendParentIframeMessage( data );
	}

	var openPhotoSwipe = function( index, galleryElement, disableAnimation, fromURL ) {
		var pswpElement = document.querySelectorAll(".pswp")[0],
			gallery,
			options,
			items;

		items = parseThumbnailElements(galleryElement);

		// define options (if needed)
		options = {
			// define gallery index (for URL)
			galleryUID: galleryElement.getAttribute("data-pswp-uid"),

			getThumbBoundsFn: function(index) {
				// See Options -> getThumbBoundsFn section of documentation for more info
				var thumbnail = items[index].el.getElementsByClassName( "pswp-item-thumb" )[0], // find thumbnail
					image_content = items[index].el.getElementsByClassName( "rex-custom-scrollbar" )[0],
					pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
					rect = image_content.getBoundingClientRect(),
					image_type = thumbnail.getAttribute("data-thumb-image-type");

				if (image_type == "natural") {
					return { x: rect.left, y: rect.top + pageYScroll, w: rect.width };
				} else {
					// var full_rect = items[index].el.getBoundingClientRect();
					// return {x:full_rect.left, y:full_rect.top + pageYScroll, w:full_rect.width};;
					return null;
				}
			},

			galleryPIDs: true,
			closeOnScroll: false,
			showHideOpacity: true
		};

		// PhotoSwipe opened from URL
		if (fromURL) {
			if (options.galleryPIDs) {
				// parse real index when custom PIDs are used
				// http://photoswipe.com/documentation/faq.html#custom-pid-in-url
				for (var j = 0, tot_items = items.length; j < tot_items; j++) {
					if (items[j].pid == index) {
						options.index = j;
						break;
					}
				}
			} else {
				// in URL indexes start from 1
				options.index = parseInt(index, 10) - 1;
			}
		} else {
			options.index = parseInt(index, 10);
		}

		// handling split scrollable section
		if ( Rexbuilder_Util.hasClass( galleryElement, 'split-scrollable' ) ) {
			/* Searching the relative index, based on number of the current
			opacity block photoswipe elements */
			var elementsToShow = $(galleryElement)
				.find('.pswp-figure')
				.eq(index)
				.parents('.opacity-block')
				.find('.pswp-figure')
				.get();

			var searchedFigure = $(galleryElement).find('.pswp-figure').eq(index).get(0);

			options.index = elementsToShow.indexOf(searchedFigure);

			/* Filtering items according to opacity block images */
			items = items.filter(function (item) {
				for (var i = 0; i < elementsToShow.length; i++) {
					if (item.el === elementsToShow[i]) {
						return true;
					}
				}
				return false;
			});
		} else {

			// if the section has sliders, the behaviour changes a little
			// - on a slider, opens only the sliders images
			// - on other images, opens all the section images, except the ones on the sliders
			var hasSliders = 0 !== ( Array.prototype.slice.call( galleryElement.getElementsByClassName('block-has-slider') ) ).length ? true : false;
			if ( hasSliders ) {
				// check if the item clicked is a slider
				var click_item_parent = Rexbuilder_Util.parents( items[index].el, '.perfect-grid-item' );
				var filter_slider = false;
				if ( click_item_parent ) {
					if ( Rexbuilder_Util.hasClass( click_item_parent, 'block-has-slider' ) ) {
						filter_slider = true;
					}
				}

				// filter the items
				items = items.filter( function(item) {
					var block_parent = Rexbuilder_Util.parents( item.el, '.perfect-grid-item' );
					if ( block_parent ) {
						if ( Rexbuilder_Util.hasClass( block_parent, 'block-has-slider' ) ) {
							return ( filter_slider ? true : false );
						} else {
							return ( filter_slider ? false : true );
						}
					}
					return true;
				});
			}
		}

		// exit if index not found
		if (isNaN(options.index)) {
			return;
		}

		if (disableAnimation) {
			options.showAnimationDuration = 0;
		}

		// Pass data to PhotoSwipe and initialize it
		gallery = new PhotoSwipe(
			pswpElement,
			PhotoSwipeUI_Default,
			items,
			options
		);

		gallery.init();
		if ( Rexbuilder_Util.isIframe ) {
			onOpenPhotoswipeInsideIframe();
			gallery.listen('close', onClosePhotoswipeInsideIframe);
		}
	};

	/**
	 * Loops through all galleries and through all slider elements and moves slider
	 * overlays inside photoswipe items, only if both are present
	 * @param		{NodeList}	galleryElements
	 * @returns {void}
	 * @since		2.0.4
	 */
	function _fixSliderOverlay(galleryElements) {
		var gallerySliderElements;
		var tot_gallerySliderElements;

		var gallerySliderPhotoswipeItem;
		var gallerySliderOverlayElement;

		var tot_galleryElements = galleryElements.length;
		var i = 0;
		var j = 0;

		// Through all galleries (sections)
		for (; i < tot_galleryElements; i++) {
			gallerySliderElements = Array.prototype.slice.call(galleryElements[i].querySelectorAll('.rex-slider-element'));
			tot_gallerySliderElements = gallerySliderElements.length;

			// Through all RexSlider elements
			for (j = 0; j < tot_gallerySliderElements; j++) {
				gallerySliderPhotoswipeItem = gallerySliderElements[j].querySelector('.pswp-item');
				gallerySliderOverlayElement = gallerySliderElements[j].querySelector('.slider-overlay');

				if (gallerySliderPhotoswipeItem && gallerySliderOverlayElement) {
					// Moves overlay element
					gallerySliderPhotoswipeItem.appendChild(gallerySliderOverlayElement);
				}
			}
		}
	}

	var _init = function(gallerySelector) {
		gallerySelectorGlobal = gallerySelector;

		var galleryElements = document.querySelectorAll(gallerySelector);

		var tot_galleryElements = galleryElements.length;
		var i = 0;

		// loop through all gallery elements and bind events
		for (; i < tot_galleryElements; i++) {
			galleryElements[i].setAttribute('data-pswp-uid', i + 1);
			galleryElements[i].onclick = onThumbnailsClick;
		}

		_fixSliderOverlay(galleryElements);

		// Parse URL and open gallery if it contains #&pid=3&gid=1
		var hashData = photoswipeParseHash();
		if ( hashData.pid && hashData.gid ) {
			openPhotoSwipe(
				hashData.pid,
				galleryElements[hashData.gid - 1],
				true,
				true
			);
		}
	};

	return {
		init: _init,
		addElement: _addElement,
		addElementFromInline: _addElementFromInline,
		removeElement: _removeElement,
		init_inline_pswp: init_inline_pswp
	};
})(jQuery);
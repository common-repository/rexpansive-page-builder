/**
 * Attaching handlers on events that creates blocks
 * of text, image, video ...
 * Contains utility function to handle the moving of blocks
 * between rows
 * @since 2.0.0
 */
var Rexbuilder_CreateBlocks = (function ($, window, document) {
  'use strict';

	/**
	 * Not used at the moment
	 * @param {event} e
	 * @deprecated
	 */
  function handleAddNewBlockEmpty(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var $section = $(e.target).parents(".rexpansive_section");
    var galleryInstance = Rexbuilder_Util.getGalleryInstance($section);
    var $el = galleryInstance.createNewBlock(galleryInstance.settings.galleryLayout);
    var el = $el[0];
    $el.find(".grid-item-content").addClass("empty-content");

    Rexbuilder_Util.updateSectionStateLive($section);
    if (Rexbuilder_Util.activeLayout == "default") {
      Rexbuilder_Util.updateDefaultLayoutStateSection($section);
    }

    var data = {
      eventName: "rexlive:edited",
      modelEdited: $section.hasClass("rex-model-section")
    };
    Rexbuilder_Util_Editor.sendParentIframeMessage(data);
  }

  /**
   * Handle the user insert new text block
   * @since 2.0.0
   * @edit  22-03-2019  Finding the best text block width
   */
  function handleNewBlockText(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var $section = $(e.target).parents(".rexpansive_section");
    var galleryInstance = Rexbuilder_Util.getGalleryInstance($section);

    // calculate the new block dimensions
    var indx = new IndexedGrid(12);
    var bs = galleryInstance.getGridstackNodes();
    for(var i=0;i<bs.length; i++) {
      indx.setGrid(bs[i].x,bs[i].y,bs[i].width,bs[i].height);
      // indx.checkGrid( ( 12 * bs[i].y ) + bs[i].x );
    }
    // try to fit a 1x1 block to find the first available position
    // var i_pos = indx.willFit(2,2)
    // var pos = galleryInstance._getCoord(i_pos,12);
    var holes = indx.findHoles();
    var negGrid = indx.negativeGrid();
    var new_dim = _findDimension( holes, negGrid );
    var new_w;
    var new_h;

    if( new_dim.w > 2 && new_dim.h > 2 ) {
      new_w = new_dim.w;
      new_h = new_dim.h;
    }

    var $el = galleryInstance.createNewBlock(galleryInstance.settings.galleryLayout, new_w, new_h, "text");
    var el = $el[0];

    Rexbuilder_Live_Utilities.launchTooltips();

    // focus the text editor, to fast text insertion
    var event = jQuery.Event("dblclick");
    event.target = el;
    event.offsetY = 0;
    galleryInstance.$element.trigger(event);

    Rexbuilder_Util.editedDataInfo.addBlockData( $section.attr("data-rexlive-section-id"), el.getAttribute('data-rexbuilder-block-id') );

    Rexbuilder_Util.updateSectionStateLive($section);
    if (Rexbuilder_Util.activeLayout == "default") {
      Rexbuilder_Util.updateDefaultLayoutStateSection($section);
    }
    var data = {
      eventName: "rexlive:edited",
      modelEdited: $section.hasClass("rex-model-section")
    };
    Rexbuilder_Util_Editor.sendParentIframeMessage(data);
  }

  /**
  * Listen to insert block event coming from the parent window
  * @since 2.0.0
  */
  function handleInsertNewTextBlock(e) {
    var data = e.settings.data_to_send;

    var $section;

    var blockWidth;
    var blockHeight;
    var addBlockButton = false;
    var addBlockElement = false;

    if (typeof data.addBlockButton !== "undefined" && data.addBlockButton.toString() == "true") {
      addBlockButton = true;
      $section = data.$section;
    } else if (typeof data.addBlockElement !== "undefined" && data.addBlockElement.toString() == "true") {
      addBlockElement = true;
      $section = data.$section;
    } else {
      if (data.sectionTarget.modelNumber != "") {
        $section = Rexbuilder_Util.$rexContainer.find('section[data-rexlive-section-id="' + data.sectionTarget.sectionID + '"][data-rexlive-model-number="' + data.sectionTarget.modelNumber + '"]');
      } else {
        $section = Rexbuilder_Util.$rexContainer.find('section[data-rexlive-section-id="' + data.sectionTarget.sectionID + '"]');
      }
		}

		var galleryInstance = Rexbuilder_Util.getGalleryInstance($section);
		if (addBlockButton) {
			blockWidth = 4;
			blockHeight = 100;
			blockHeight = Math.ceil(blockHeight / galleryInstance.properties.singleHeight);
		} else if (addBlockElement) {
			var ratio = ($section.width() / Rexbuilder_Util.globalViewport.width) * 100;
			blockWidth = ratio <= 50 ? 12 : ratio <= 75 ? 6 : 4;
			blockHeight = Math.ceil(100 / galleryInstance.properties.singleHeight);
		}

    var $el = galleryInstance.createNewBlock(galleryInstance.settings.galleryLayout, blockWidth, blockHeight, "text");
		var el = $el[0];

    Rexbuilder_Live_Utilities.launchTooltips();

    Rexbuilder_Util.editedDataInfo.addBlockData( data.sectionTarget.sectionID, el.getAttribute('data-rexbuilder-block-id') );

    Rexbuilder_Util.updateSectionStateLive($section);
    if (Rexbuilder_Util.activeLayout == "default") {
      Rexbuilder_Util.updateDefaultLayoutStateSection($section);
		}

    if ( 'undefined' !== typeof data.mousePosition ) {
  		var gridstackInstance = galleryInstance.properties.gridstackInstance;
  		var mouseCell = gridstackInstance.getCellFromPixel({ left: data.mousePosition.x, top: data.mousePosition.y }, true);

  		// Infinity fix
  		var moveX = Math.max(0, mouseCell.x - Math.round(blockWidth / 2));
  		var moveY = Math.max(0, mouseCell.y - Math.round(blockHeight / 2));
  		moveX = Infinity !== moveX ? moveX : 0;
  		moveY = Infinity !== moveY ? moveY : 0;

  		gridstackInstance.move(el, moveX, moveY);
    }

    var ev = null;
    if (addBlockButton) {
      ev = jQuery.Event('rexlive:completeImportButton');
      ev.settings = {
        $buttonWrapper: data.$buttonWrapper,
        $blockAdded: $el
      };
    } else if (addBlockElement) {
      ev = jQuery.Event('rexlive:completeImportElement');
      ev.settings = {
        $elementWrapper: data.$elementWrapper,
        $elementAdded: $el,
        formFieldsString: data.formFieldsString
      };
    }

    if ( ev ) {
		  Rexbuilder_Util.$document.trigger(ev);
    }

    var event = jQuery.Event("dblclick");
    event.target = el;
    event.offsetY = 0;
		galleryInstance.$element.trigger(event);

		var data = {
			eventName: 'rexlive:edited',
			modelEdited: $section.hasClass('rex-model-section')
		};
		Rexbuilder_Util_Editor.sendParentIframeMessage(data);
  }

  /**
   * Insert block images in a row
   * @since 2.0.0
   */
  function handleInsertImage(e) {
    var data = e.settings.data_to_send;

    var $section;
    if (data.sectionTarget.modelNumber != "") {
      $section = Rexbuilder_Util.$rexContainer.find('section[data-rexlive-section-id="' + data.sectionTarget.sectionID + '"][data-rexlive-model-number="' + data.sectionTarget.modelNumber + '"]');
    } else {
      $section = Rexbuilder_Util.$rexContainer.find('section[data-rexlive-section-id="' + data.sectionTarget.sectionID + '"]');
    }


    var galleryInstance = Rexbuilder_Util.getGalleryInstance($section);
    var i;

    var media = data.media;

    var gridWidth = galleryInstance.properties.wrapWidth;
    var singleWidth = galleryInstance.properties.singleWidth;
    var masonryHeight = galleryInstance.settings.cellHeightMasonry;

    for (i = 0; i < media.length; i++) {
      var $el,
        idImage = media[i].media_info.id,
        urlImage = media[i].display_info.src,
        sizeImage = media[i].display_info.size,
        w = media[i].display_info.width,
        h = media[i].display_info.height,
        type = "",
        blockW = 1,
        blockH = 1;

      if (w > gridWidth) {
        blockW = 6;
      } else {
        blockW = Math.max(Math.round(w * 6 / gridWidth), 1);
      }
			blockH = Math.max(Math.round(h * blockW / w), 1);

      if (galleryInstance.settings.galleryLayout == "fixed") {
        $el = galleryInstance.createNewBlock("fixed", blockW, blockH, "image");
        type = "full";
      } else {
        var gutter = galleryInstance.properties.gutter;
        if (blockW * singleWidth < w) {
          blockH = ((h * blockW * singleWidth) / w);
        } else {
          blockH = h + gutter;
        }
        blockH = Math.max(Math.round(blockH / masonryHeight), 1);
        $el = galleryInstance.createNewBlock("masonry", blockW, blockH, "image");
        type = "natural";
			}

      var dataImage = {
        idImage: idImage,
        urlImage: urlImage,
        sizeImage: sizeImage,
        width: w,
        height: h,
        typeBGimage: type,
        active: "true"
      };

      Rexbuilder_Dom_Util.updateImageBG($el.find(".grid-item-content"), dataImage);

      var el = $el[0];
      Rexbuilder_Util.editedDataInfo.addBlockData( data.sectionTarget.sectionID, el.getAttribute('data-rexbuilder-block-id') );
    }
    Rexbuilder_Live_Utilities.launchTooltips();

    Rexbuilder_Util.updateSectionStateLive($section);
    if (Rexbuilder_Util.activeLayout == "default") {
      Rexbuilder_Util.updateDefaultLayoutStateSection($section);
    }
    var data = {
      eventName: "rexlive:edited",
      modelEdited: $section.hasClass("rex-model-section")
    };
    Rexbuilder_Util_Editor.sendParentIframeMessage(data);
  }

  function handleInsertVideo(e) {
    var data = e.settings.data_to_send;
    if ( typeof data.typeVideo !== "undefined" ) {
      var $section;

      if (data.sectionTarget.modelNumber != "") {
        $section = Rexbuilder_Util.$rexContainer.find('section[data-rexlive-section-id="' + data.sectionTarget.sectionID + '"][data-rexlive-model-number="' + data.sectionTarget.modelNumber + '"]');
      } else {
        $section = Rexbuilder_Util.$rexContainer.find('section[data-rexlive-section-id="' + data.sectionTarget.sectionID + '"]');
      }

      var galleryInstance = Rexbuilder_Util.getGalleryInstance($section);
      var audio = typeof data.hasAudio == "undefined" ? "" : data.hasAudio;
      var urlYoutube = typeof data.urlYoutube == "undefined" ? "" : data.urlYoutube;
      var urlVimeo = typeof data.urlVimeo == "undefined" ? "" : data.urlVimeo;
      var videoMp4 = typeof data.videoMp4 == "undefined" ? "" : data.videoMp4;

      var type = "";

      if (videoMp4.length != 0) {
        type = "mp4";
      } else if (urlVimeo != "") {
        type = "vimeo";
      } else if (urlYoutube != "") {
        type = "youtube";
      }

      if (videoMp4.length == 0) {
        var $el = _createBlockGrid(galleryInstance, 3, 3, 'video');
        var $itemContent = $el.find(".grid-item-content");
        var videoOptions = {
          mp4Data: {
            idMp4: "",
            linkMp4: "",
            width: "",
            height: "",
          },
          vimeoUrl: urlVimeo,
          youtubeUrl: urlYoutube,
          audio: audio,
          typeVideo: type
        };
        Rexbuilder_Dom_Util.updateVideos($itemContent, videoOptions);
        var el = $el[0];
        Rexbuilder_Util.editedDataInfo.addBlockData( data.sectionTarget.sectionID, el.getAttribute('data-rexbuilder-block-id') );
      } else {
        for (var i = 0; i < videoMp4.length; i++) {
          var $el = _createBlockGrid(galleryInstance, 3, 3, 'video');
          var $itemContent = $el.find(".grid-item-content");
          var mp4Url = videoMp4[i].videoUrl;
          var mp4ID = videoMp4[i].videoID;
          var mp4width = videoMp4[i].width;
          var mp4height = videoMp4[i].height;

          var videoOptions = {
            mp4Data: {
              idMp4: mp4ID,
              linkMp4: mp4Url,
              width: mp4width,
              height: mp4height,
            },
            vimeoUrl: "",
            youtubeUrl: "",
            audio: audio,
            typeVideo: type
          };
          Rexbuilder_Dom_Util.updateVideos($itemContent, videoOptions);
          var el = $el[0];

          Rexbuilder_Util.editedDataInfo.addBlockData( data.sectionTarget.sectionID, el.getAttribute('data-rexbuilder-block-id') );
        }
      }
    }
    // Rexbuilder_Block_Editor.updateBlockTools($el);
    Rexbuilder_Live_Utilities.launchTooltips();
    Rexbuilder_Util.updateSectionStateLive($section);
    if (Rexbuilder_Util.activeLayout == "default") {
      Rexbuilder_Util.updateDefaultLayoutStateSection($section);
    }
    var data = {
      eventName: "rexlive:edited",
      modelEdited: $section.hasClass("rex-model-section")
    };
    Rexbuilder_Util_Editor.sendParentIframeMessage(data);
  }

  function handleInsertSlider(e) {
    var $el = _createSlider(e.settings.data_to_send);
    var $section;
    if (e.settings.data_to_send.target.modelNumber != "") {
      $section = Rexbuilder_Util.$rexContainer.find('section[data-rexlive-section-id="' + e.settings.data_to_send.target.sectionID + '"][data-rexlive-model-number="' + e.settings.data_to_send.target.modelNumber + '"]');
    } else {
      $section = Rexbuilder_Util.$rexContainer.find('section[data-rexlive-section-id="' + e.settings.data_to_send.target.sectionID + '"]');
    }
    // Rexbuilder_Block_Editor.updateBlockTools($el);
    Rexbuilder_Live_Utilities.launchTooltips();

    Rexbuilder_Util.editedDataInfo.addBlockData( e.settings.data_to_send.target.sectionID, $el.attr('data-rexbuilder-block-id') );

    Rexbuilder_Util.updateSectionStateLive($section);
    if (Rexbuilder_Util.activeLayout == "default") {
      Rexbuilder_Util.updateDefaultLayoutStateSection($section);
    }
    var data = {
      eventName: "rexlive:edited",
      modelEdited: $section.hasClass("rex-model-section")
    };
    Rexbuilder_Util_Editor.sendParentIframeMessage(data);
  }

  /**
   * Add event listeners for block insertion
   * @since  2.0.3
   */
  function addListeners() {
    // Rexbuilder_Util.$document.on("click", ".add-new-block-empty", handleAddNewBlockEmpty);
    Rexbuilder_Util.$document.on("click", ".add-new-block-text", handleNewBlockText);

    Rexbuilder_Util.$document.on("rexlive:insert_new_text_block", handleInsertNewTextBlock);
    Rexbuilder_Util.$document.on("rexlive:insert_image", handleInsertImage);
    Rexbuilder_Util.$document.on("rexlive:insert_video", handleInsertVideo);
    Rexbuilder_Util.$document.on("rexlive:insert_new_slider", handleInsertSlider);
  }

  /**
   * Find the dimension of a new block to fit an empty space
   * @param {array} holes list of empty start indexes
   * @param {array} negativeGrid list of empty indexes
   */
  var _findDimension = function( holes, negativeGrid )
  {
    var w = 0;
    var h = 0;
    for( var j=0; j<holes.length; j++ )
    {
      var start = negativeGrid.indexOf( holes[j] + 1 );
      var end = start;
      while( end < negativeGrid.length )
      {
        end++;
        if ( negativeGrid[end] + 1 == negativeGrid[end+1] )
        { } else { break; }
      }
      w = negativeGrid[end]-negativeGrid[start]+1;
      if ( w <= 2 ) { continue; }
      h = 0;
      while( true ) {
        h++;
        if( -1 !== negativeGrid.indexOf( negativeGrid[start] + (12 * h) ) && -1 !== negativeGrid.indexOf( negativeGrid[end] + (12 * h) ) )
        { } else { break; }
      }
      if ( h <= 2 ) { continue; } else { break; }
    }
    // h++;
    return { w: w, h: h };
  };

	/**
	 * @param	{object} data
	 * @param	{JQuery} $elem
	 * @param	{number} numberSlider
	 */
  function _createSlider(data, $elem, numberSlider) {
		var sliderNumber;

    if (typeof numberSlider == "undefined") {
      Rexbuilder_Dom_Util.lastSliderNumber = Rexbuilder_Dom_Util.lastSliderNumber + 1;
      sliderNumber = Rexbuilder_Dom_Util.lastSliderNumber;
    } else {
      sliderNumber = numberSlider;
    }

    var slides = data.slides;
    var sliderData = {
      id: data.id,
      settings: data.settings,
      numberSlides: slides.length
    };

    var $el;
    var $textWrap;
    if (typeof $elem == "undefined") {
      var $section;
      if (data.target.modelNumber != "") {
        $section = Rexbuilder_Util.$rexContainer.find('section[data-rexlive-section-id="' + data.target.sectionID + '"][data-rexlive-model-number="' + data.target.modelNumber + '"]');
      } else {
        $section = Rexbuilder_Util.$rexContainer.find('section[data-rexlive-section-id="' + data.target.sectionID + '"]');
      }

      var galleryInstance = Rexbuilder_Util.getGalleryInstance($section);
      if (typeof data.target.rexID == "undefined") {
        $el = _createBlockGrid(galleryInstance, 12, 4, "rexslider");
      } else {
        $el = $section.find("div [data-rexbuilder-block-id=\"" + data.target.rexID + "\"]");
      }
      $textWrap = $el.find(".text-wrap");
      $textWrap.children().remove();
    } else {
      $el = $elem;
      $textWrap = $el.find(".text-wrap");
		}

		var $elData = $el.children('.rexbuilder-block-data');

		$el.addClass('block-has-slider');
		$el.find('.block-toolBox__editor-tools').find('.edit-block-content').addClass('tool-button--hide');
		$elData.attr('data-type', 'rexslider');

		// @todo, pass correct data to generate natural-blur effect if any
		var $sliderWrap = _createSliderWrap($textWrap, sliderData);

		// var blockHasOverlay = 0 !== $textWrap.parents('.responsive-block-overlay').length;
    var blockHasOverlay = 'true' == $elData.attr('data-overlay_block_color_active');
    var overlayColor = '';
		if ( blockHasOverlay ) {
			overlayColor = $textWrap.parents('.responsive-block-overlay').css('background-color');
		}
		var wantNaturalBlurEffect = data.settings.natural_blur;

		var $slideHTML = $(Rexbuilder_Live_Templates.getParsedTemplate('tmpl-new-slider-element'));
		var $slideVideoHTML = $(Rexbuilder_Live_Templates.getParsedTemplate('slide-video'));
		var $slideTextHTML = $(Rexbuilder_Live_Templates.getParsedTemplate('slide-text'));

    for (var i = 0; i < slides.length; i++) {
			var $slide = $slideHTML.clone();
			var currentSlideData = slides[i];

			var slideHasImageURL = 'none' !== currentSlideData.slide_image_url;
			var slideHasText = 0 !== currentSlideData.slide_text.trim().length;
			var slideHasVideo = '' !== currentSlideData.slide_video_type;

			if (blockHasOverlay) {
				_addOverlayToSlide($slide, overlayColor);
			}

			if (slideHasImageURL) {
				if (wantNaturalBlurEffect) {
					_addBlurredImageToSlide($slide, currentSlideData);
				} else {
					_addBackgroundImageToSlide($slide, currentSlideData);
				}
			}

			// if (!wantNaturalBlurEffect && hasImageURL) {
			// 	_addBackgroundImageToSlide($slide, currentSlideData);
			// }

			// if (wantNaturalBlurEffect && hasImageURL) {
			// 	_addBlurredImageToSlide($slide, currentSlideData);
			// }

			if (slideHasText) {
				_addTextToSlide($slide, currentSlideData, $slideTextHTML);
			}

      $slide.appendTo($sliderWrap[0]);

			// url over slide text
      if (currentSlideData.slide_url != "") {
        tmpl.arg = "link";
        var $linkEl = $(tmpl("tmpl-new-slider-element-link", {
					url: currentSlideData.slide_url
        }));

        $slide.children(".rex-slider-element-title").detach().appendTo($linkEl[0]);
        $slide.append($linkEl[0]);
      }

      if (slideHasVideo) {
				$slide.append($slideVideoHTML.clone());

				var $videoElement = $slide.find('.rex-slider-video-wrapper');
				var videoType = currentSlideData.slide_video_type;
				var videoHasAudio = currentSlideData.slide_video_audio.toString() == 'true';

				switch (videoType) {
					case 'mp4':
						_addMp4ToSlide($videoElement, currentSlideData);
						break;
					case 'vimeo':
						_addVimeoToSlide($videoElement, currentSlideData);
						break;
					case 'youtube':
						_addYouTubeToSlide($videoElement, currentSlideData);
						break;
					default:
						break;
				}

				if (videoHasAudio) {
					$videoElement.append(tmpl('tmpl-video-toggle-audio'));
				}
			}
    }

    $sliderWrap.attr("data-rex-slider-number", sliderNumber);

    RexSlider.initSlider($sliderWrap);

    return $el;
  };

  var _createSliderWrap = function ($textWrap, data) {
    tmpl.arg = "slider";
    var $sliderWrap = $(tmpl("tmpl-new-slider-wrap", {
      id: data.id,
      animation: data.settings.auto_start ? true : 0,
      dots: data.settings.dots ? 1 : 0,
      prevnext: data.settings.prev_next ? 1 : 0,
      numberSlides: data.numberSlides
    }));

    $textWrap.append($sliderWrap[0]);
    return $sliderWrap;
  };

  var _createBlockGrid = function (galleryInstance, w, h, block_type) {
    block_type = typeof block_type !== 'undefined' ? block_type : '';
    var $el;
    var singleWidth = galleryInstance.properties.singleWidth,
      blockW = w,
      blockH = h;
    if (galleryInstance.settings.galleryLayout == "fixed") {
      $el = galleryInstance.createNewBlock("fixed", blockW, blockH, block_type);
    } else {
      blockH = Math.max(Math.round(blockH * singleWidth / galleryInstance.settings.cellHeightMasonry), 1);
      $el = galleryInstance.createNewBlock("masonry", blockW, blockH, block_type);
    }
    return $el;
  };

  var _createCopyBlock = function ($elem) {
    var $gallery = $elem.parents('.grid-stack-row');
		var galleryEditorInstance = $gallery.data().plugin_perfectGridGalleryEditor;
    var gridstack = $gallery.data("gridstack");
    var $section = $elem.parents(".rexpansive_section");
    var $newBlock;

    $newBlock = $elem.clone(false);
		var $newBlockData = $newBlock.children(".rexbuilder-block-data");

    galleryEditorInstance._removeHandles($newBlock);

    var newRexID = Rexbuilder_Util.createBlockID();

    galleryEditorInstance.properties.lastIDBlock = galleryEditorInstance.properties.lastIDBlock + 1;

    var newBlockID = "block_" + galleryEditorInstance.properties.sectionNumber + "_" + galleryEditorInstance.properties.lastIDBlock;

    $newBlock.attr("data-rexbuilder-block-id", newRexID);
    $newBlockData.attr("data-rexbuilder_block_id", newRexID);
    $newBlock.attr("id", newBlockID);
    $newBlockData.attr("data-id", newBlockID);
    $newBlockData.attr("id", newBlockID + "-builder-data");

    sanitizeBlockContent( $newBlock[0] );

    var w = parseInt($newBlock.attr("data-gs-width"));
    var h = parseInt($newBlock.attr("data-gs-height"));
    var $itemContent = $newBlock.find(".grid-item-content");
		var videoTypeActive = Rexbuilder_Util.destroyVideo($itemContent, false);

    // Rexbuilder_Util_Editor.removeScrollBar($newBlock);
		Rexbuilder_Live_Utilities.removeTextEditor($newBlock);
    Rexbuilder_Live_Utilities.removeColorPicker($newBlock);
    galleryEditorInstance._prepareElement($newBlock[0]);
    galleryEditorInstance.unFocusElementEditing($newBlock);

    var reverseData = {
      targetElement: $newBlock,
      hasToBeRemoved: true,
      galleryInstance: galleryEditorInstance,
      blocksDisposition: $.extend(true, {}, galleryEditorInstance.properties.reverseDataGridDisposition)
    };

		gridstack.addWidget($newBlock[0], 0, 0, w, h, true, 1, 500, 1);

    var x = parseInt($newBlock.attr("data-gs-x"));
    var y = parseInt($newBlock.attr("data-gs-y"));

    gridstack.batchUpdate();
    gridstack.update($newBlock[0], x, y, w, h);
		gridstack.commit();

		// Rexwpcf7 operations
		$newBlock.find('.rexwpcf7-column-tools').remove();

		$newBlock.find('.rex-element-wrapper').each(function (index, element) {
			var id = element.getAttribute('data-rex-element-id');

			Rexbuilder_Rexwpcf7_Editor.addMissingTools(id);
		});

		// RexButtons operations
		Rexbuilder_Rexbutton.refreshNumbers();
		Rexbuilder_Rexbutton.updateButtonListInPage();

    galleryEditorInstance._createFirstReverseStack();
    galleryEditorInstance.properties.numberBlocksVisibileOnGrid = galleryEditorInstance.properties.numberBlocksVisibileOnGrid + 1;
    var actionData = {
      targetElement: $newBlock,
      hasToBeRemoved: false,
      galleryInstance: galleryEditorInstance,
      blocksDisposition: $.extend(true, {}, galleryEditorInstance.properties.reverseDataGridDisposition)
    };

    Rexbuilder_Util_Editor.pushAction(galleryEditorInstance.$element, "updateBlockVisibility", actionData, reverseData);
    $newBlock.removeAttr("data-gs-auto-position");
    if (videoTypeActive != "") {
      $itemContent.addClass(videoTypeActive + "-player");
		}

    Rexbuilder_Util.startVideoPlugin($itemContent);

		var $textWrap = $newBlock.find(".text-wrap");

    if ($elem.hasClass("block-has-slider")) {
      var $oldSlider = $elem.find('.text-wrap').children('.rex-slider-wrap[data-rex-slider-active="true"]');
      $textWrap.children().remove();
      var sectionID = $section.attr("data-rexlive-section-id");
      var modelNumber = typeof $section.attr("data-rexlive-model-number") != "undefined" ? $section.attr("data-rexlive-model-number") : "";
      var rex_block_id = newRexID;

      var target = {
        sectionID: sectionID,
        modelNumber: modelNumber,
        rexID: rex_block_id
      };

      var sliderData = Rexbuilder_Live_Utilities.createSliderData($oldSlider);
      Rexbuilder_Live_Utilities.saveSliderOnDB(sliderData, true, newBlockID, target);
    } 

    Rexbuilder_Live_Utilities.launchTooltips();
    Rexbuilder_Util.updateSectionStateLive($section);
    if (Rexbuilder_Util.activeLayout == "default") {
      Rexbuilder_Util.updateDefaultLayoutStateSection($section);
		}

    // notify the editing of the page
    var data = {
      eventName: "rexlive:edited",
      modelEdited: false
    };
    Rexbuilder_Util_Editor.sendParentIframeMessage(data);
  };

  /**
   * Sanitize the block content before the copy
   * @param  {Element} elem element to sanitize
   * @return {void}
   * @since  2.0.3
   */
  var sanitizeBlockContent = function( elem ) {
    var textWrap = elem.querySelector('.text-wrap');
    // sanitize buttons
    sanitizeButtons( textWrap );
  };

  /**
   * Sanitizing the buttons
   * @param  {Element} textWrap text wrap
   * @return {void}
   * @since  2.0.3
   *
   * @todo generate the style to view correctly the button live
   * @todo handling the copy of a section with multiple sync buttons
   */
  var sanitizeButtons = function( textWrap ) {
    if ( ! textWrap ) {
      return;
    }

    var buttonWrappers = [].slice.call( textWrap.getElementsByClassName('rex-button-wrapper') );
    var tot_buttonWrappers = buttonWrappers.length, i;
    var buttonData, buttonModelID, temp;

    for( i=0; i < tot_buttonWrappers; i++ ) {
      // separated button
      if ( Rexbuilder_Util.hasClass( buttonWrappers[i], 'rex-separate-button' ) ) {
        buttonWrappers[i].setAttribute('data-rex-button-id', Rexbuilder_Util.createBlockID());
        buttonWrappers[i].setAttribute('data-rex-button-number', '1');
        // @todo generate the style to view correctly the button live
      } else {    // synched button
        buttonModelID = buttonWrappers[i].getAttribute( 'data-rex-button-id' );
        temp = [].slice.call( document.querySelectorAll('.rex-button-wrapper[data-rex-button-id="' + buttonModelID + '"]'));
        buttonWrappers[i].setAttribute('data-rex-button-number', temp.length + 1);

        buttonData = buttonWrappers[i].querySelector('.rex-button-data');
        if ( buttonData ) {
          buttonData.removeAttribute('data-synchronize');
        }
      }
    }
  };

  /**
   * Insert a new block in gridstack starting from an html element
   * @param	{JQuery}	$elem			Element to insert
   * @param	{JQuery}	$gallery	Gallery where insert
   * @since 2.0.0
   */
  function insertHTMLBlock($elem, $gallery, updatePosition, updateHeight) {
		updatePosition = 'undefined' !== typeof updatePosition ? updatePosition : true;
		updateHeight = 'undefined' !== typeof updateHeight ? updateHeight : true;

		if ($gallery.length <= 0) return;

		var galleryEditorInstance = $gallery.data().plugin_perfectGridGalleryEditor;
		var gridstack = $gallery.data('gridstack');
		var $section = $gallery.parents('.rexpansive_section');
		var $newBlock = $elem;
		var $newBlockData = $newBlock.children('.rexbuilder-block-data');

		galleryEditorInstance._removeHandles($newBlock);

		galleryEditorInstance.properties.lastIDBlock = galleryEditorInstance.properties.lastIDBlock + 1;

		var newBlockID =
			'block_' + galleryEditorInstance.properties.sectionNumber + '_' + galleryEditorInstance.properties.lastIDBlock;

		var blockRexID = $newBlock.attr('data-rexbuilder-block-id');
		if ('' === blockRexID) {
			blockRexID = Rexbuilder_Util.createBlockID();
			$newBlock.attr('data-rexbuilder-block-id', blockRexID);
			$newBlockData.attr('data-rexbuilder_block_id', blockRexID);
		}

		if ('' === $newBlock.attr('id')) {
			$newBlock.attr('id', newBlockID);
			$newBlockData.attr('data-id', newBlockID);
			$newBlockData.attr('id', newBlockID + '-builder-data');
		}

		$newBlock.appendTo($gallery.eq(0));

		Rexbuilder_Block.addToolboxClean($newBlock.get(0));

		var x = parseInt($newBlock.attr('data-gs-x'));
		var y = parseInt($newBlock.attr('data-gs-y'));
		var w = parseInt($newBlock.attr('data-gs-width'));
		var h = parseInt($newBlock.attr('data-gs-height'));
		var $itemContent = $newBlock.find('.grid-item-content');
		var videoTypeActive = Rexbuilder_Util.destroyVideo($itemContent, false);

		// Rexbuilder_Util_Editor.removeScrollBar($newBlock);
		Rexbuilder_Live_Utilities.removeTextEditor($newBlock);
		Rexbuilder_Live_Utilities.removeColorPicker($newBlock);
		galleryEditorInstance._prepareElement($newBlock[0]);
		galleryEditorInstance.unFocusElementEditing($newBlock);

		var reverseData = {
			targetElement: $newBlock,
			hasToBeRemoved: true,
			galleryInstance: galleryEditorInstance,
			blocksDisposition: $.extend(true, {}, galleryEditorInstance.properties.reverseDataGridDisposition)
		};

		if (updateHeight) {
			if ('masonry' === galleryEditorInstance.settings.galleryLayout) {
				h = Math.floor(
					(h * galleryEditorInstance.properties.singleWidth) / galleryEditorInstance.properties.singleHeight
				);
			}
		}

		gridstack.addWidget($newBlock[0], 0, 0, w, h, true, 1, 500, 1);

		if (updatePosition) {
			gridstack.batchUpdate();
			gridstack.update($newBlock[0], x, y, w, h);
			gridstack.commit();
		}

		galleryEditorInstance._updateElementsSizeViewers();

		galleryEditorInstance._createFirstReverseStack();
		galleryEditorInstance.properties.numberBlocksVisibileOnGrid =
			galleryEditorInstance.properties.numberBlocksVisibileOnGrid + 1;
		var actionData = {
			targetElement: $newBlock,
			hasToBeRemoved: false,
			galleryInstance: galleryEditorInstance,
			blocksDisposition: $.extend(true, {}, galleryEditorInstance.properties.reverseDataGridDisposition)
		};

		Rexbuilder_Util_Editor.pushAction(galleryEditorInstance.$element, 'updateBlockVisibility', actionData, reverseData);
		$newBlock.removeAttr('data-gs-auto-position');
		if (videoTypeActive != '') {
			$itemContent.addClass(videoTypeActive + '-player');
		}
		Rexbuilder_Util.startVideoPlugin($itemContent);

		var $textWrap = $newBlock.find('.text-wrap');

		if ($elem.hasClass('block-has-slider')) {
			var $oldSlider = $elem.find('.text-wrap').children('.rex-slider-wrap[data-rex-slider-active="true"]');
			$textWrap.children().remove();
			var sectionID = $section.attr('data-rexlive-section-id');
			var modelNumber =
				typeof $section.attr('data-rexlive-model-number') != 'undefined'
					? $section.attr('data-rexlive-model-number')
					: '';
			var rex_block_id = blockRexID;

			var target = {
				sectionID: sectionID,
				modelNumber: modelNumber,
				rexID: rex_block_id
			};

			var sliderData = Rexbuilder_Live_Utilities.createSliderData($oldSlider);
			Rexbuilder_Live_Utilities.saveSliderOnDB(sliderData, true, newBlockID, target);
		} 
    
		Rexbuilder_Live_Utilities.launchTooltips();

		Rexbuilder_Util.updateSectionStateLive($section);
		if (Rexbuilder_Util.activeLayout == 'default') {
			Rexbuilder_Util.updateDefaultLayoutStateSection($section);
		}
	}

  /**
   * Move a block from a section to another
   * @param {jQuery Object} $elem Elemtn to move
   * @param {jQuery Object} $targetSection Section of destination
   */
  var _moveBlockToOtherSection = function ($elem, $targetSection) {
    // var $gallery = $elem.parents('.grid-stack-row');
    var galleryEditorInstance = $targetSection.data().plugin_perfectGridGalleryEditor;
    var gridstack = $targetSection.data("gridstack");
    var $section = $elem.parents(".rexpansive_section");
    var previousGalleryInstance = $section.find('.perfect-grid-gallery').data().plugin_perfectGridGalleryEditor;
    var previousLayout = previousGalleryInstance.settings.galleryLayout;
    var nextLayout = galleryEditorInstance.settings.galleryLayout;
    var $newBlock;

    $newBlock = $elem.clone(false);
    var $newBlockData = $newBlock.children(".rexbuilder-block-data");

    galleryEditorInstance._removeHandles($newBlock);

    var newRexID = Rexbuilder_Util.createBlockID();

    galleryEditorInstance.properties.lastIDBlock = galleryEditorInstance.properties.lastIDBlock + 1;

    var newBlockID = "block_" + galleryEditorInstance.properties.sectionNumber + "_" + galleryEditorInstance.properties.lastIDBlock;

    $newBlock.attr("data-rexbuilder-block-id", newRexID);
    $newBlockData.attr("data-rexbuilder_block_id", newRexID);
    $newBlock.attr("id", newBlockID);
    $newBlockData.attr("data-id", newBlockID);
    $newBlockData.attr("id", newBlockID + "-builder-data");

    $newBlock.appendTo($targetSection.eq(0));

    var w = parseInt($newBlock.attr("data-gs-width"));
    var h = parseInt($newBlock.attr("data-gs-height"));
    if ( previousLayout !== nextLayout )
    {
      switch( nextLayout )
      {
        case 'fixed':
          // from masonry to fixed
          h = Math.floor( ( h * 5 ) / galleryEditorInstance.properties.singleHeight );
          break;
        case 'masonry':
          h = Math.floor( ( h * previousGalleryInstance.properties.singleHeight ) / 5 );
          // from fixed to masonry
          break;
        default:
          break;
      }
    }
    var $itemContent = $newBlock.find(".grid-item-content");
    var videoTypeActive = Rexbuilder_Util.destroyVideo($itemContent, false);

    // Rexbuilder_Util_Editor.removeScrollBar($newBlock);
    Rexbuilder_Live_Utilities.removeTextEditor($newBlock);
    Rexbuilder_Live_Utilities.removeColorPicker($newBlock);
    galleryEditorInstance._prepareElement($newBlock[0]);
    galleryEditorInstance.unFocusElementEditing($newBlock);

    var reverseData = {
      targetElement: $newBlock,
      hasToBeRemoved: true,
      galleryInstance: galleryEditorInstance,
      blocksDisposition: $.extend(true, {}, galleryEditorInstance.properties.reverseDataGridDisposition)
    };

    gridstack.addWidget($newBlock[0], 0, 0, w, h, true, 1, 500, 1);

    galleryEditorInstance._updateElementsSizeViewers();

    var x = parseInt($newBlock.attr("data-gs-x"));
    var y = parseInt($newBlock.attr("data-gs-y"));

    gridstack.batchUpdate();
    gridstack.update($newBlock[0], x, y, w, h);
    gridstack.commit();

    galleryEditorInstance._createFirstReverseStack();
    galleryEditorInstance.properties.numberBlocksVisibileOnGrid = galleryEditorInstance.properties.numberBlocksVisibileOnGrid + 1;
    var actionData = {
      targetElement: $newBlock,
      hasToBeRemoved: false,
      galleryInstance: galleryEditorInstance,
      blocksDisposition: $.extend(true, {}, galleryEditorInstance.properties.reverseDataGridDisposition)
    };

    Rexbuilder_Util_Editor.pushAction(galleryEditorInstance.$element, "updateBlockVisibility", actionData, reverseData);
    $newBlock.removeAttr("data-gs-auto-position");
    if (videoTypeActive != "") {
      $itemContent.addClass(videoTypeActive + "-player");
    }
    Rexbuilder_Util.startVideoPlugin($itemContent);

    var $textWrap = $newBlock.find(".text-wrap");

    if ($elem.hasClass("block-has-slider")) {
      var $oldSlider = $elem.find(".text-wrap").children(".rex-slider-wrap[data-rex-slider-active=\"true\"]");
      $textWrap.children().remove();
      var sectionID = $section.attr("data-rexlive-section-id");
      var modelNumber = typeof $section.attr("data-rexlive-model-number") != "undefined" ? $section.attr("data-rexlive-model-number") : "";
      var rex_block_id = newRexID;

      var target = {
        sectionID: sectionID,
        modelNumber: modelNumber,
        rexID: rex_block_id
      };

      var sliderData = Rexbuilder_Live_Utilities.createSliderData($oldSlider);
      Rexbuilder_Live_Utilities.saveSliderOnDB(sliderData, true, newBlockID, target);
    } 

    Rexbuilder_Live_Utilities.launchTooltips();
    Rexbuilder_Util.updateSectionStateLive($section);
    if (Rexbuilder_Util.activeLayout == "default") {
      Rexbuilder_Util.updateDefaultLayoutStateSection($section);
    }
  };

	/**
	 * @param	{JQuery}	$slide
	 * @param	{string}	overlayColor
	 * @since	2.0.8
	 */
	function _addOverlayToSlide($slide, overlayColor) {
		var $overlayHTML = $(Rexbuilder_Live_Templates.getParsedTemplate('slider-overlay', {
			overlayColor: overlayColor
		}));
		$slide.append($overlayHTML.clone());
	}

	/**
	 * @param	{JQuery}	$slide
	 * @param	{object}	slideData
	 * @param	{string}	slideData.slide_image_url
	 * @since	2.0.8
	 */
	function _addBlurredImageToSlide($slide, slideData) {
		var imageURL = slideData.slide_image_url;
		var blurSlide = _createBlurSlideElement(imageURL);
		var naturalSlide = _createNaturalSlideElement(imageURL);

		$slide.addClass('natural-slide__wrap');
		$slide.append(blurSlide);
		$slide.append(naturalSlide);
	}

	/**
	 * @param	{JQuery}	$slide
	 * @param	{object}	slideData
	 * @param	{string}	slideData.slide_image_url
	 * @param	{string}	slideData.slide_image_id
	 * @since	2.0.8
	 */
	function _addBackgroundImageToSlide($slide, slideData) {
		var imageURL = slideData.slide_image_url;
		var imageID = slideData.slide_image_id;

		$slide.css('background-image', 'url(' + imageURL + ')');
		$slide.attr('data-rex-slide-image-id', imageID);
	}

	/**
	 * @param	{JQuery}	$slide
	 * @param	{object}	slideData
	 * @param	{string}	slideData.slide_text
	 * @since	2.0.8
	 */
	function _addTextToSlide($slide, slideData, $slideTextHTML) {
		var slideText = slideData.slide_text;

		$slide.append($slideTextHTML.clone());
		$slide.find('.rex-slider-element-title').html(slideText);
	}

	/**
	 * @param {string} imageURL
	 * @since	2.0.8
	 */
	function _createNaturalSlideElement(imageURL) {
		var naturalSlide = document.createElement('img');

		naturalSlide.className = 'natural-slide';
		naturalSlide.src = imageURL;

		return naturalSlide;
	}

	/**
	 * @param {string} imageURL
	 * @since	2.0.8
	 */
	function _createBlurSlideElement(imageURL) {
		var blurSlide = document.createElement('div');

		blurSlide.className = 'natural-blur-effect blur-slide';
		blurSlide.style.backgroundImage = 'url(' + imageURL + ')';

		return blurSlide;
	}

	/**
	 * @param {JQuery} $videoElement
	 * @param {object} currentSlideData
	 * @param {string} currentSlideData.slide_videoMp4Url
	 * @param {string} currentSlideData.slide_video
	 * @since	2.0.8
	 */
	function _addMp4ToSlide($videoElement, currentSlideData) {
		tmpl.arg = 'video';

		$videoElement.prepend(
			tmpl('tmpl-video-mp4', {
				url: currentSlideData.slide_videoMp4Url
			})
		);
		$videoElement.addClass('mp4-player');
		$videoElement.children('.rex-video-wrap').attr('data-rex-video-mp4-id', currentSlideData.slide_video);
	}

	/**
	 * @param {JQuery} $videoElement
	 * @param {object} currentSlideData
	 * @param {string} currentSlideData.slide_video
	 * @since	2.0.8
	 */
	function _addVimeoToSlide($videoElement, currentSlideData) {
		tmpl.arg = 'video';

		$videoElement.prepend(
			tmpl('tmpl-video-vimeo', {
				url: currentSlideData.slide_video
			})
		);
		$videoElement.addClass('vimeo-player');
	}

	/**
	 * @param {JQuery} $videoElement
	 * @param {object} currentSlideData
	 * @param {string} currentSlideData.slide_video
	 * @since	2.0.8
	 */
	function _addYouTubeToSlide($videoElement, currentSlideData) {
		tmpl.arg = 'video';

		$videoElement.prepend(
			tmpl('tmpl-video-youtube', {
				url: currentSlideData.slide_video,
				audio: false
			})
		);
		$videoElement.addClass('youtube-player');
	}

  /**
   * Object init function
   * @return {void}
   * @since  2.0.3
   */
  function init() {
    addListeners();
  }

  return {
    init: init,
    createSlider: _createSlider,
    createCopyBlock: _createCopyBlock,
    insertHTMLBlock: insertHTMLBlock,
    moveBlockToOtherSection: _moveBlockToOtherSection,
		sanitizeBlockContent: sanitizeBlockContent,
  };

})(jQuery, window, document);

var Rexbuilder_Util = (function ($) {
	'use strict';

	/**
	 * Class manipulation methods
	 */
	var hasClass, addClass, removeClass, toggleClass;

	if ('classList' in document.documentElement) {
		hasClass = function (el, className) {
			return el.classList.contains(className);
		};
		addClass = function (el, className) {
			el.classList.add(className);
		};
		removeClass = function (el, className) {
			el.classList.remove(className);
		};
	} else {
		hasClass = function (el, className) {
			return new RegExp('\\b' + className + '\\b').test(el.className);
		};
		addClass = function (el, className) {
			if (!hasClass(el, className)) {
				el.className += ' ' + className;
			}
		};
		removeClass = function (el, className) {
			el.className = el.className.replace(new RegExp('\\b' + className + '\\b', 'g'), '');
		};
	}

	toggleClass = function (el, className) {
		if (hasClass(el, className)) {
			removeClass(el, className);
		} else {
			addClass(el, className);
		}
	};

	// timing utilities
	/**
	 * Set timeout function rewritten with requestanimation frame
	 * @param  {Function} callback [description]
	 * @param  {Number}   delay    delay time
	 * @return {Object}
	 */
	function rtimeOut(callback, delay) {
		var dateNow = Date.now,
			requestAnimation = window.requestAnimationFrame,
			start = dateNow(),
			stop,
			timeoutFunc = function () {
				dateNow() - start < delay ? stop || requestAnimation(timeoutFunc) : callback();
			};
		requestAnimation(timeoutFunc);

		return {
			clear: function () {
				stop = 1;
			}
		};
	}

	/**
	 * Set interval function rewritten with requestanimation frame
	 * @param  {Function} callback [description]
	 * @param  {Number}   delay    delay time
	 * @return {Object}
	 */
	function rInterval(callback, delay) {
		var dateNow = Date.now,
			requestAnimation = window.requestAnimationFrame,
			start = dateNow(),
			stop,
			intervalFunc = function () {
				dateNow() - start < delay || ((start += delay), callback());
				stop || requestAnimation(intervalFunc);
			};
		requestAnimation(intervalFunc);

		return {
			clear: function () {
				stop = 1;
			}
		};
	}

	/**
	 * Global vars
	 */
	var editorMode = false;
	var windowIsResizing = false;
	var responsiveLayouts;
	var defaultLayoutSections;
	var $modelsCustomizationsDataDiv;
	var $pageCustomizationsDataDiv;
	var $liveDataContainer;
	var $layoutsDomOrder;
	/** @type {JQuery} */
	var $defaultLayoutState;
	var frontAvailableLayouts;
	var startFrontLayout;
	var changedFrontLayout;
	var layoutSavedInfo;

	// Sections IDs used
	var $usedIDSContainer;
	var sectionIDSused;

	// Blocks IDs used

	// DOM Element containing the IDs. It's only used at init to create an Array that also contains the IDs.
	// This DOM Element is updated everytime the user saves, and never read (except at init)
	var $usedBlocksIDsContainer;
	var blocksIDsUsed;

	/** @type {JQuery} */
	var $rexbuilderLayoutData;
	var $rexbuilderModelData;
	var $availableLayoutNames;

	var edlTimeouts = [];

	var $bodyHtml;

	function handlingRowReadyEnd(idx) {
		edlTimeouts[idx] = null;
		if ('' === edlTimeouts.join('')) {
			// Triggering event after edit dom layout end
			Rexbuilder_Util.playAllVideos();

			var ev = jQuery.Event('rexlive:editDomLayoutEnd');
			Rexbuilder_Util.$document.trigger(ev);

			edlTimeouts = [];
		}
	}

	var createRandomID = function (n) {
		var text = '';
		var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

		for (var i = 0; i < n; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}

		return text;
	};

	var _createRandomNumericID = function (n) {
		var number = '';
		var possible = '0123456789';

		for (var i = 0; i < n; i++) {
			number += possible.charAt(Math.floor(Math.random() * possible.length));
		}

		return parseInt(number);
	};

	var _storeNamesUsed = function () {
		sectionIDSused = $usedIDSContainer.length > 0 ? JSON.parse($usedIDSContainer.text()) : [];
	};

	var _saveSectionNamesUsed = function () {
		$usedIDSContainer.text(JSON.stringify(sectionIDSused));
	};

	var _getSectionNamesUsed = function () {
		return sectionIDSused;
	};

	var _addSectionID = function (rex_id) {
		var i;
		for (i = sectionIDSused.length - 1; i >= 0; i--) {
			if (rex_id == sectionIDSused[i]) {
				break;
			}
		}
		if (i == -1) {
			sectionIDSused.push(rex_id);
		}
	};

	var _removeSectionID = function (rex_id) {
		var i = 0;
		for (i = sectionIDSused.length - 1; i >= 0; i--) {
			if (rex_id == sectionIDSused[i]) {
				break;
			}
		}
		if (i > -1) {
			sectionIDSused.splice(i, 1);
			_saveSectionNamesUsed();
		}
	};

	var _createSectionID = function () {
		var id;
		var isValidID;
		var idLength = 4;
		var i;
		do {
			isValidID = true;
			id = createRandomID(idLength);
			if (id == 'self') {
				isValidID = false;
			} else {
				for (i = 0; i < sectionIDSused.length; i++) {
					if (id == sectionIDSused[i]) {
						isValidID = false;
						break;
					}
				}
			}
		} while (!isValidID);

		_addSectionID(id);

		return id;
	};

	var _updateSectionsIDs = function () {
		if (!Rexbuilder_Util.rexContainer) return;

		var id;
		var $sec;
		var sections = [].slice.call(Rexbuilder_Util.rexContainer.getElementsByClassName('rexpansive_section'));
		var tot_sections = sections.length,
			i;
		for (i = 0; i < tot_sections; i++) {
			var sectionId = sections[i].getAttribute('data-rexlive-section-id');
			if (null === sectionId || '' === sectionId) {
				id = _createSectionID();
				sections[i].setAttribute('data-rexlive-section-id', id);
				_fix_tools_ids(sections[i], id);
			}
		}
	};

	/**
	 * Fix tools IDs for a new page section
	 * - Width tool
	 * - Layout tool
	 * @param {Node} section dom element of a section
	 * @param {string} id unique character id
	 */
	var _fix_tools_ids = function (section, id) {
		if (!section) return;

		var left_tools = [].slice.call(section.getElementsByClassName('tool-area--side tool-area--left'));
		var tot_left_tools = left_tools.length,
			i,
			j;
		var editRowWidth, tot_editRowWidth;
		var editRowLayout, tot_editRowLayout;

		for (i = 0; i < tot_left_tools; i++) {
			editRowWidth = [].slice.call(left_tools[i].getElementsByClassName('edit-row-width'));
			tot_editRowWidth = editRowWidth.length;
			for (j = 0; j < tot_editRowWidth; j++) {
				editRowWidth[j].setAttribute('id', editRowWidth[j].getAttribute('id') + id);
				editRowWidth[j].setAttribute('name', editRowWidth[j].getAttribute('name') + id);
				editRowWidth[j].nextElementSibling.setAttribute(
					'for',
					editRowWidth[j].nextElementSibling.getAttribute('for') + id
				);
			}

			editRowLayout = [].slice.call(left_tools[i].getElementsByClassName('edit-row-layout'));
			tot_editRowLayout = editRowLayout.length;
			for (j = 0; j < tot_editRowLayout; j++) {
				editRowLayout[j].setAttribute('id', editRowLayout[j].getAttribute('id') + id);
				editRowLayout[j].setAttribute('name', editRowLayout[j].getAttribute('name') + id);
				editRowLayout[j].nextElementSibling.setAttribute(
					'for',
					editRowLayout[j].nextElementSibling.getAttribute('for') + id
				);
			}
		}
	};

	var _updateSectionsNumber = function () {
		var last = -1;
		if (!Rexbuilder_Util.rexContainer) {
			return;
		}

		var sections = [].slice.call(Rexbuilder_Util.rexContainer.getElementsByClassName('rexpansive_section'));
		var tot_sections = sections.length,
			i;
		for (i = 0; i < tot_sections; i++) {
			sections[i].setAttribute('data-rexlive-section-number', i);
			last = i;
		}

		Rexbuilder_Util.lastSectionNumber = last;
	};

	function _storeBlocksIDsUsed() {
		blocksIDsUsed = $usedBlocksIDsContainer.length > 0 ? JSON.parse($usedBlocksIDsContainer.text()) : [];
	}

	function saveBlocksIDsUsed() {
		$usedBlocksIDsContainer.text(JSON.stringify(blocksIDsUsed));
	}

	function updateBlocksIDsUsed(newBlocksIDsUsed) {
		blocksIDsUsed = newBlocksIDsUsed;
		saveBlocksIDsUsed();
	}

	function getBlocksIDsUsed() {
		return blocksIDsUsed;
	}

	/**
	 * Adds the new RexID to the Array and then removed the duplicates from it.
	 * In this way the addition of already existing RexIDs is prevented.
	 * (May not be so much readable, but requires less lines of code)
	 * @param {String} newBlockID
	 * @since	2.0.6
	 */
	function addBlockID(newBlockID) {
		blocksIDsUsed.push(newBlockID);
		blocksIDsUsed = Rexbuilder_Util.removeArrayDuplicates(blocksIDsUsed);
	}

	function removeBlockID(blockID) {
		var i = blocksIDsUsed.length - 1;

		for (; i >= 0; i--) {
			if (blockID == blocksIDsUsed[i]) {
				break;
			}
		}

		if (i > -1) {
			blocksIDsUsed.splice(i, 1);
			saveBlocksIDsUsed();
		}
	}

	/**
	 * Generates a new unique block RexID and adds it to the blocksIDsUsed Array.
	 * This function, its linked variables and functions need to stay in the "build" folder,
	 * because in certain situations it may be needed in the public (frontend) side.
	 * @returns	{newID}
	 * @since		2.0.?
	 * @version	2.0.6		Edited check in the for loop, not checking page blocks' RexIDs anymore
	 * 									but used RexIDs blocks (that are global, not referenced only to the current page).
	 * 									Now the RexIDs are unique for the whole website.
	 */
	function createBlockID() {
		var newID;
		var isValidID;

		do {
			newID = createRandomID(4);

			if (newID === 'self') {
				// 'self' may be misleading because how the page data is saved.
				// Sections' own data is referenced as 'self'
				isValidID = false;
			} else {
				isValidID = -1 === blocksIDsUsed.indexOf(newID);
			}
		} while (!isValidID);

		addBlockID(newID);

		return newID;
	}

	function _updateBlocksIDs() {
		if (!Rexbuilder_Util.rexContainer) return;

		var blocks = Array.prototype.slice.call(Rexbuilder_Util.rexContainer.getElementsByClassName('grid-stack-item'));
		var newID;
		var currentBlockID;

		for (var i = 0; i < blocks.length; i++) {
			currentBlockID = blocks[i].getAttribute('data-rexbuilder-block-id');

			if (null === currentBlockID || '' === currentBlockID) {
				newID = createBlockID();
				blocks[i].setAttribute('data-rexbuilder-block-id', newID);
			}
		}
	}

	var _findLayoutType = function (name) {
		if (name == 'default' || name == 'tablet' || name == 'mobile') {
			return 'standard';
		}
		return 'custom';
	};

	/**
	 * Calculating the actual layout based on the device size
	 * @since 2.0.0
	 */
	var _findFrontLayout = function () {
		// var dev_w = _viewport().width;
		var dev_w = Rexbuilder_Util.globalViewport.width;
		for (var i = frontAvailableLayouts.length - 1; i >= 0; i--) {
			if (
				dev_w >= parseInt(frontAvailableLayouts[i].min) &&
				('' != frontAvailableLayouts[i].max ? dev_w <= parseInt(frontAvailableLayouts[i].max) : true)
			) {
				return frontAvailableLayouts[i].id;
			}
		}
	};

	var _getModelsCustomizations = function () {
		var data = [];
		$modelsCustomizationsDataDiv.children('.model-customizations-container').each(function (i, modelData) {
			var $modelData = $(modelData);
			var modelID = parseInt($modelData.attr('data-model-id'));
			var customizations = [];
			$modelData.children('.model-customization-data').each(function (j, modelCustomization) {
				var $modelCustomization = $(modelCustomization);
				var customizationName = $modelCustomization.attr('data-model-layout-name');
				var customizationTargets = JSON.parse($modelCustomization.text());
				var customization = {
					name: customizationName,
					targets: customizationTargets
				};
				customizations.push(customization);
			});
			var modelCustomizations = {
				id: modelID,
				customizations: customizations
			};
			data.push(modelCustomizations);
		});
		return data;
	};

	var _updateModelsCustomizationsData = function (updatedModelCustomizationsData) {
		var i;
		var tot_updatedModelCustomizationsData;
		var model_ID_to_update = updatedModelCustomizationsData.id;
		var $modelDataDiv = $modelsCustomizationsDataDiv.children(
			'.model-customizations-container[data-model-id="' + model_ID_to_update + '"]'
		);

		if ($modelDataDiv.length != 0) {
			$modelDataDiv.children('.model-customization-data').remove();
		} else {
			$modelDataDiv = $(document.createElement('script'));
			$modelDataDiv.addClass('model-customizations-container');
			$modelDataDiv.attr('data-model-id', model_ID_to_update);
			$modelDataDiv.appendTo($modelsCustomizationsDataDiv[0]);
		}

		for (
			i = 0, tot_updatedModelCustomizationsData = updatedModelCustomizationsData.customizations.length;
			i < tot_updatedModelCustomizationsData;
			i++
		) {
			var $div = $(document.createElement('script'));
			$div.addClass('model-customization-data');
			$div.attr('data-model-layout-name', updatedModelCustomizationsData.customizations[i].name);
			$div.text(JSON.stringify(updatedModelCustomizationsData.customizations[i].targets));
			$div.appendTo($modelDataDiv[0]);
		}
		$modelsCustomizationsDataDiv.attr('data-empty-models-customizations', false);
	};

	var _updateDivModelCustomizationsNames = function (updatedModelCustomizationsNames) {
		var $modelsAvaiableNamesDiv = $rexbuilderModelData.find('.available-models-customizations-names');
		var names = JSON.parse($modelsAvaiableNamesDiv.text());
		var newNamesData = [];
		var i;
		var tot_names;

		for (i = 0, tot_names = names.length; i < tot_names; i++) {
			var namesData = names[i];
			if (namesData.id != updatedModelCustomizationsNames.id) {
				newNamesData.push(namesData);
			}
		}

		newNamesData.push(updatedModelCustomizationsNames);
		$modelsAvaiableNamesDiv.text(JSON.stringify(newNamesData));
	};

	// returns customizations
	var _getPageCustomizations = function () {
		var data = [];

		var defaultLayout = {
			name: 'default',
			sections: []
		};

		var $pageDefaultLayoutWrapper = $pageCustomizationsDataDiv.children(
			'.customization-wrap[data-customization-name="default"]'
		);
		$pageDefaultLayoutWrapper.children('.section-targets').each(function (j, sectionTargetsElem) {
			var $sectionTargetsElem = $(sectionTargetsElem);
			var sectionRexID = $sectionTargetsElem.attr('data-section-rex-id');
			var modelID = isNaN(parseInt($sectionTargetsElem.attr('data-model-id')))
				? -1
				: parseInt($sectionTargetsElem.attr('data-model-id'));
			var modelNumber = isNaN(parseInt($sectionTargetsElem.attr('data-model-number')))
				? -1
				: parseInt($sectionTargetsElem.attr('data-model-number'));
			var hideSection =
				typeof $sectionTargetsElem.attr('data-section-hide') == 'undefined'
					? false
					: $sectionTargetsElem.attr('data-section-hide').toString() == '1'
					? true
					: false;
			var targets = $sectionTargetsElem.text() != '' ? JSON.parse($sectionTargetsElem.text()) : [];

			defaultLayout.sections.push({
				section_rex_id: sectionRexID,
				section_model_id: modelID != -1 ? modelID : '',
				section_model_number: modelNumber != -1 ? modelNumber : '',
				section_is_model: modelID != -1,
				section_hide: hideSection,
				targets: targets
			});
		});

		data.push(defaultLayout);

		$pageCustomizationsDataDiv
			.children('.customization-wrap:not([data-customization-name="default"])')
			.each(function (i, customizationWrap) {
				var $customizationWrap = $(customizationWrap);
				var customizationName = $customizationWrap.attr('data-customization-name');
				var layoutCustomization = {
					name: customizationName,
					sections: []
				};

				$customizationWrap.children('.section-targets').each(function (j, sectionTargetsElem) {
					var $sectionTargetsElem = $(sectionTargetsElem);
					var sectionRexID = $sectionTargetsElem.attr('data-section-rex-id');
					var modelID = isNaN(parseInt($sectionTargetsElem.attr('data-model-id')))
						? -1
						: parseInt($sectionTargetsElem.attr('data-model-id'));
					var modelNumber = isNaN(parseInt($sectionTargetsElem.attr('data-model-number')))
						? -1
						: parseInt($sectionTargetsElem.attr('data-model-number'));
					var hideSection =
						typeof $sectionTargetsElem.attr('data-section-hide') == 'undefined'
							? false
							: $sectionTargetsElem.attr('data-section-hide').toString() == '1'
							? true
							: false;
					var targets = $sectionTargetsElem.text() != '' ? JSON.parse($sectionTargetsElem.text()) : [];
					var section_created_live =
						typeof $sectionTargetsElem.attr('data-section-created-live') == 'undefined'
							? false
							: $sectionTargetsElem.attr('data-section-created-live').toString() == '1'
							? true
							: false;
					layoutCustomization.sections.push({
						section_rex_id: sectionRexID,
						section_model_id: modelID != -1 ? modelID : '',
						section_model_number: modelNumber != -1 ? modelNumber : '',
						section_is_model: modelID != -1,
						section_hide: hideSection,
						section_created_live: section_created_live,
						targets: targets
					});
				});
				data.push(layoutCustomization);
			});

		return data;
	};

	var _createPageCustomizationsDataLive = function (sectionsData) {
		$liveDataContainer.children().remove();
		var i;
		var tot_sectionsData;
		for (i = 0, tot_sectionsData = sectionsData.length; i < tot_sectionsData; i++) {
			var $div = $(document.createElement('script'));
			$div.addClass('section-targets');
			$div.attr('data-section-rex-id', sectionsData[i].section_rex_id);
			$div.attr('data-model-id', sectionsData[i].section_model_id);
			$div.attr('data-model-number', sectionsData[i].section_model_number);
			$div.attr('data-section-hide', sectionsData[i].section_hide);
			$div.text(JSON.stringify(sectionsData[i].targets));
			$div.appendTo($liveDataContainer[0]);
		}
	};

	var _updatePageCustomizationsData = function (updatedPageCustomizationsData) {
		var layoutNameToUpdate = updatedPageCustomizationsData.name;
		var $customizationWrapper = $pageCustomizationsDataDiv.children(
			'.customization-wrap[data-customization-name="' + layoutNameToUpdate + '"]'
		);
		var i;
		var tot_updatedPageCustomizationsData;

		if ($customizationWrapper.length != 0) {
			$customizationWrapper.children('.section-targets').remove();
		} else {
			$customizationWrapper = $(document.createElement('script'));
			$customizationWrapper.addClass('customization-wrap');
			$customizationWrapper.attr('data-customization-name', layoutNameToUpdate);
			$customizationWrapper.appendTo($pageCustomizationsDataDiv[0]);
		}

		for (
			i = 0, tot_updatedPageCustomizationsData = updatedPageCustomizationsData.sections.length;
			i < tot_updatedPageCustomizationsData;
			i++
		) {
			var $div = $(document.createElement('script'));
			$div.addClass('section-targets');
			$div.attr('data-section-rex-id', updatedPageCustomizationsData.sections[i].section_rex_id);
			$div.attr('data-model-id', updatedPageCustomizationsData.sections[i].section_model_id);
			$div.attr('data-model-number', updatedPageCustomizationsData.sections[i].section_model_number);
			$div.attr('data-section-hide', updatedPageCustomizationsData.sections[i].section_hide);
			$div.attr(
				'data-section-created-live',
				updatedPageCustomizationsData.sections[i].section_created_live.toString() == 'true' ? '1' : false
			);
			if (updatedPageCustomizationsData.sections[i].section_model_id == '') {
				$div.text(JSON.stringify(updatedPageCustomizationsData.sections[i].targets));
			}
			$div.appendTo($customizationWrapper[0]);
		}
		$pageCustomizationsDataDiv.removeAttr('data-empty-customizations');
	};

	var _updatePageAvaiableLayoutsNames = function (updatedNames) {
		$availableLayoutNames.text(JSON.stringify(updatedNames));
	};

	var _getSectionCustomLayouts = function (sectionRexID) {
		var layouts = [];

		var pageCustomizations = Rexbuilder_Util.getPageCustomizations();
		var i, j;
		var tot_pageCustomizations, tot_pageCustomizations_sections;

		for (i = 0, tot_pageCustomizations = pageCustomizations.length; i < tot_pageCustomizations; i++) {
			var layoutName = pageCustomizations[i].name;
			if (pageCustomizations[i].sections != null) {
				for (
					j = 0, tot_pageCustomizations_sections = pageCustomizations[i].sections.length;
					j < tot_pageCustomizations_sections;
					j++
				) {
					if (pageCustomizations[i].sections[j].section_rex_id == sectionRexID) {
						var targets = jQuery.extend(true, [], pageCustomizations[i].sections[j].targets);
						var customization = {
							name: layoutName,
							targets: targets
						};
						layouts.push(customization);
					}
				}
			}
		}
		return layouts;
	};

	var chooseLayout = function () {
		var $responsiveData = $rexbuilderLayoutData;
		var $modelData = $rexbuilderModelData;

		Rexbuilder_Util.chosenLayoutData = {
			min: 0,
			max: '',
			id: 'default',
			label: 'My Desktop',
			type: 'standard'
		};

		if (
			$responsiveData.children('.layouts-data').attr('data-empty-customizations') == 'true' ||
			(Rexbuilder_Util.editorMode && Rexbuilder_Util.firstStart)
		) {
			return 'default';
		}

		// var windowWidth = _viewport().width;
		var windowWidth = Rexbuilder_Util.globalViewport.width;
		var i, j, k;
		var tot_allLayoutsDimensions,
			tot_allModelsCustomizationsNames,
			tot_allModelsCustomizationsNames_names,
			tot_avaiableNames,
			tot_layoutsPageNames,
			tot_ordered;
		var availableDims = document.getElementById('layout-avaiable-dimensions');
		var allLayoutsDimensions = availableDims ? JSON.parse(availableDims.textContent) : [];
		var $availableModelsNames = $modelData.children('.available-models-customizations-names');
		var allModelsCustomizationsNames = $availableModelsNames.length > 0 ? JSON.parse($availableModelsNames.text()) : [];
		var $availableLayoutNames = $responsiveData.children('#available-layouts-names');
		var avaiableNames = $availableLayoutNames.length > 0 ? JSON.parse($availableLayoutNames.text()) : [];

		var layoutsPageNames = [];
		var flag_insert;

		for (i = 0, tot_allLayoutsDimensions = allLayoutsDimensions.length; i < tot_allLayoutsDimensions; i++) {
			flag_insert = false;
			// models
			for (
				j = 0, tot_allModelsCustomizationsNames = allModelsCustomizationsNames.length;
				j < tot_allModelsCustomizationsNames;
				j++
			) {
				for (
					k = 0, tot_allModelsCustomizationsNames_names = allModelsCustomizationsNames[j].names.length;
					k < tot_allModelsCustomizationsNames_names;
					k++
				) {
					if (allLayoutsDimensions[i].id == allModelsCustomizationsNames[j].names[k]) {
						var dim = allLayoutsDimensions[i];
						dim.model = true;
						flag_insert = true;
						layoutsPageNames.push(dim);
					}
				}
			}
			if (!flag_insert) {
				for (k = 0, tot_avaiableNames = avaiableNames.length; k < tot_avaiableNames; k++) {
					if (allLayoutsDimensions[i].id == avaiableNames[k]) {
						var dim = allLayoutsDimensions[i];
						dim.model = false;
						flag_insert = true;
						layoutsPageNames.push(dim);
					}
				}
			}
		}

		for (i = 0, tot_layoutsPageNames = layoutsPageNames.length; i < tot_layoutsPageNames; i++) {
			if (layoutsPageNames[i].min == '') {
				layoutsPageNames[i].min = 0;
			}
		}

		var selectedLayoutName = '';

		var sortBy = function (key) {
			return function (a, b) {
				return a[key] > b[key] ? 1 : b[key] > a[key] ? -1 : 0;
			};
		};

		// Creating a copy of layoutsPageNames and sorting it
		var ordered = layoutsPageNames.concat();
		// ordered.concat().sort(sortBy('min'));
		ordered.sort(sortBy('min'));

		for (i = 0, tot_ordered = ordered.length; i < tot_ordered; i++) {
			if (windowWidth >= ordered[i].min) {
				if (ordered[i].max != '') {
					if (windowWidth <= ordered[i].max) {
						selectedLayoutName = ordered[i].id;
						Rexbuilder_Util.chosenLayoutData = ordered[i];
					}
				} else {
					selectedLayoutName = ordered[i].id;
					Rexbuilder_Util.chosenLayoutData = ordered[i];
				}
			}
		}

		if (selectedLayoutName === '') {
			selectedLayoutName = 'default';
		}

		return selectedLayoutName;
	};

	/**
	 * Predict the acutal layout based on browser size
	 */
	var predictLayout = function () {
		// var w = _viewport().width;
		var w = Rexbuilder_Util.globalViewport.width;
		if (w <= 767) {
			return 'mobile';
		} else if (w <= 1024) {
			return 'tablet';
		}
		return 'default';
	};

	var _createEmptyTargets = function (targetsToEmpty) {
		var emptyTargets = [];
		var i;
		var tot_targetsToEmpty;
		for (i = 0, tot_targetsToEmpty = targetsToEmpty.length; i < tot_targetsToEmpty; i++) {
			var emptyTarget = {
				name: targetsToEmpty[i].name,
				props: {}
			};
			if (
				targetsToEmpty[i].name == 'self' &&
				// _viewport().width <
				_isMobile()
			) {
				emptyTarget.props.collapse_grid = true;
			}
			emptyTargets.push(emptyTarget);
		}
		return emptyTargets;
	};

	//creating default page layout, merging with models default layout
	var _getDefaultPageLayout = function (layoutDataPage, layoutDataModels) {
		var defaultLayoutSections = [];
		var i, j, p, q;
		var tot_layoutDataPage,
			tot_layoutDataPag_sections,
			tot_defaultLayoutSections,
			tot_layoutDataModels,
			tot_layoutDataModels_customizations;
		for (i = 0, tot_layoutDataPage = layoutDataPage.length; i < tot_layoutDataPage; i++) {
			if (layoutDataPage[i].name == 'default') {
				for (
					j = 0, tot_layoutDataPag_sections = layoutDataPage[i].sections.length;
					j < tot_layoutDataPag_sections;
					j++
				) {
					defaultLayoutSections.push(jQuery.extend(true, {}, layoutDataPage[i].sections[j]));
				}
				break;
			}
		}

		for (i = 0, tot_defaultLayoutSections = defaultLayoutSections.length; i < tot_defaultLayoutSections; i++) {
			if (defaultLayoutSections[i].section_is_model.toString() == 'true') {
				for (p = 0, tot_layoutDataModels = layoutDataModels.length; p < tot_layoutDataModels; p++) {
					if (layoutDataModels[p].id == defaultLayoutSections[i].section_model_id) {
						for (
							q = 0, tot_layoutDataModels_customizations = layoutDataModels[p].customizations.length;
							q < tot_layoutDataModels_customizations;
							q++
						) {
							if (layoutDataModels[p].customizations[q].name == 'default') {
								defaultLayoutSections[i].targets = jQuery.extend(
									true,
									[],
									layoutDataModels[p].customizations[q].targets
								);
								break;
							}
						}
						break;
					}
				}
			}
		}

		return defaultLayoutSections;
	};

	var _getDefaultModelsLayout = function (layoutDataModels) {
		var i, j;
		var tot_layoutDataModels, tot_layoutDataModels_customizations;
		var data = [];
		for (i = 0, tot_layoutDataModels = layoutDataModels.length; i < tot_layoutDataModels; i++) {
			for (
				j = 0, tot_layoutDataModels_customizations = layoutDataModels[i].customizations.length;
				j < tot_layoutDataModels_customizations;
				j++
			) {
				if (layoutDataModels[i].customizations[j].name == 'default') {
					data.push({
						id: layoutDataModels[i].id,
						targets: layoutDataModels[i].customizations[j].targets
					});
					break;
				}
			}
		}
		return data;
	};

	/**
	 * In case of a custom layout, guessing the correct layout from which
	 * retrieve the informations to set it
	 * @param  {String} layoutName
	 * @return {String}
	 */
	function guessLayout(layoutName) {
		var allLayouts = document.getElementById('layout-avaiable-dimensions').textContent;
		allLayouts = '' !== allLayouts ? JSON.parse(allLayouts) : [];

		var layoutInfo = allLayouts.filter(function (layout) {
			return layout.id === layoutName;
		});

		// something has goes wrong
		if (!layoutInfo) return 'default';

		layoutInfo = layoutInfo[0];

		// it's standard layout, go with the classic rules
		// maybe useless control
		if ('standard' === layoutInfo.type) return 'default';

		var layoutsInPage = $availableLayoutNames.text();

		var layoutSavedInfo = allLayouts.filter(function (layout) {
			return -1 !== layoutsInPage.indexOf(layout.id);
		});

		var i,
			tot = layoutSavedInfo.length;
		var guess = '';

		// it's a mobile layout
		if (parseInt(layoutInfo.min) < _plugin_frontend_settings.defaultSettings.collapseWidth) {
			for (i = 0; i < tot; i++) {
				if (parseInt(layoutSavedInfo[i].min) < _plugin_frontend_settings.defaultSettings.collapseWidth) {
					if (
						parseInt(layoutInfo.min) >= parseInt(layoutSavedInfo[i].min) &&
						('' === layoutSavedInfo[i].max || parseInt(layoutInfo.min) <= parseInt(layoutSavedInfo[i].max))
					) {
						guess = layoutSavedInfo[i].id;
						break;
					}
				}
			}

			// no break, can be default
		} else {
			// it's another layout
			for (i = 0; i < tot; i++) {
				if (parseInt(layoutSavedInfo[i].min) >= _plugin_frontend_settings.defaultSettings.collapseWidth) {
					if (
						parseInt(layoutInfo.min) >= parseInt(layoutSavedInfo[i].min) &&
						('' === layoutSavedInfo[i].max || parseInt(layoutInfo.min) <= parseInt(layoutSavedInfo[i].max))
					) {
						guess = layoutSavedInfo[i].id;
						break;
					}
				}
			}
		}

		if ('' === guess) {
			guess = 'default';
		}

		return guess;
	}

	/**
	 * Get custom layouts sections
	 * @param  {[type]} layoutDataPage        [description]
	 * @param  {[type]} layoutDataModels      [description]
	 * @param  {[type]} defaultLayoutSections [description]
	 * @param  {String} layoutName            [description]
	 * @return {[type]}                       [description]
	 */
	var _getCustomLayoutSections = function (layoutDataPage, layoutDataModels, defaultLayoutSections, layoutName) {
		if (layoutName == 'default') {
			return defaultLayoutSections;
		}

		var layoutSelectedSections = [];
		var i, j, p, q;
		var tot_layoutDataPage,
			tot_layoutDataPage_sections,
			tot_defaultLayoutSections,
			tot_layoutSelectedSections,
			tot_layoutDataModels,
			tot_layoutDataModels_customizations,
			tot_defaultDataModels;
		var flagCustomLayoutPage = false;
		var defaultDataModels = _getDefaultModelsLayout(layoutDataModels);
		var modelCustomization;

		// search for edited layout
		for (i = 0, tot_layoutDataPage = layoutDataPage.length; i < tot_layoutDataPage; i++) {
			if (layoutDataPage[i].name == layoutName) {
				flagCustomLayoutPage = true;
				for (
					j = 0, tot_layoutDataPage_sections = layoutDataPage[i].sections.length;
					j < tot_layoutDataPage_sections;
					j++
				) {
					layoutSelectedSections.push(jQuery.extend(true, {}, layoutDataPage[i].sections[j]));
				}
				break;
			}
		}

		//means that this page has no custom layout
		if (!flagCustomLayoutPage) {
			for (i = 0, tot_defaultLayoutSections = defaultLayoutSections.length; i < tot_defaultLayoutSections; i++) {
				var newCustomSection = jQuery.extend(true, {}, defaultLayoutSections[i]);
				newCustomSection.targets = _createEmptyTargets(defaultLayoutSections[i].targets);
				newCustomSection.sectionCleared = true;
				layoutSelectedSections.push(newCustomSection);
			}
		}

		//fixing models custom layouts and empty targets
		for (i = 0, tot_layoutSelectedSections = layoutSelectedSections.length; i < tot_layoutSelectedSections; i++) {
			if (layoutSelectedSections[i].section_is_model.toString() == 'true') {
				for (p = 0, tot_layoutDataModels = layoutDataModels.length; p < tot_layoutDataModels; p++) {
					if (layoutDataModels[p].id == layoutSelectedSections[i].section_model_id) {
						modelCustomization = false;
						for (
							q = 0, tot_layoutDataModels_customizations = layoutDataModels[p].customizations.length;
							q < tot_layoutDataModels_customizations;
							q++
						) {
							if (layoutDataModels[p].customizations[q].name == layoutName) {
								modelCustomization = true;
								layoutSelectedSections[i].targets = jQuery.extend(
									true,
									[],
									layoutDataModels[p].customizations[q].targets
								);
								layoutSelectedSections[i].defaultSection = false;
								layoutSelectedSections[i].sectionCleared = false;
								break;
							}
						}
						if (!modelCustomization) {
							for (q = 0, tot_defaultDataModels = defaultDataModels.length; q < tot_defaultDataModels; q++) {
								if (layoutSelectedSections[i].section_model_id == defaultDataModels[q].id) {
									layoutSelectedSections[i].targets = _createEmptyTargets(defaultDataModels[q].targets);
									layoutSelectedSections[i].sectionCleared = true;
									break;
								}
							}
						}
						break;
					}
				}
			} else {
				if (layoutSelectedSections[i].targets.length == 0) {
					for (j = 0, tot_defaultLayoutSections = defaultLayoutSections.length; j < tot_defaultLayoutSections; j++) {
						if (layoutSelectedSections[i].section_rex_id == defaultLayoutSections[j].section_rex_id) {
							layoutSelectedSections[i].targets = _createEmptyTargets(defaultLayoutSections[j].targets);
							layoutSelectedSections[i].sectionCleared = true;
							break;
						}
					}
				}
			}
		}
		return layoutSelectedSections;
	};

	/**
	 * Merging sections to found the correct saved layout, or generate a new one
	 * based on the available information
	 * @param  {Array} layoutSelectedSections (expected) sections settings on the selected layout
	 * @param  {Array} defaultLayoutSections  sections settings on default layout
	 * @return {Array}                        the correct expected layout
	 */
	var _mergeSections = function (layoutSelectedSections, defaultLayoutSections) {
		var i, j, m, n;
		var tot_layoutSelectedSections, tot_defaultLayoutSections, tot_sectionCustom_targets, tot_sectionDefault_targets;
		var targetFounded;

		// merging custom data with default data
		if (Rexbuilder_Util.activeLayout != 'default') {
			for (i = 0, tot_layoutSelectedSections = layoutSelectedSections.length; i < tot_layoutSelectedSections; i++) {
				layoutSelectedSections[i].sectionFounded = false;
				layoutSelectedSections[i].defaultSection = false;
				for (j = 0, tot_defaultLayoutSections = defaultLayoutSections.length; j < tot_defaultLayoutSections; j++) {
					if (layoutSelectedSections[i].section_rex_id == defaultLayoutSections[j].section_rex_id) {
						layoutSelectedSections[i].sectionFounded = true;
						var sectionCustom = layoutSelectedSections[i];
						var sectionDefault = defaultLayoutSections[j];
						if (
							typeof sectionCustom.targets[0] == 'undefined' ||
							jQuery.isEmptyObject(sectionCustom.targets[0].props) ||
							(typeof sectionCustom.sectionCleared != 'undefined' && sectionCustom.sectionCleared)
						) {
							// there isn't a layout saved, i set the default by default
							// here i can check the nearest layout
							sectionCustom.defaultSection = true;
							sectionCustom.targets = jQuery.extend(true, [], sectionDefault.targets);
						}

						for (m = 0, tot_sectionCustom_targets = sectionCustom.targets.length; m < tot_sectionCustom_targets; m++) {
							targetFounded = false;
							for (
								n = 0, tot_sectionDefault_targets = sectionDefault.targets.length;
								n < tot_sectionDefault_targets;
								n++
							) {
								if (sectionCustom.targets[m].name == sectionDefault.targets[n].name) {
									sectionCustom.targets[m].notDisplay = false;
									targetFounded = true;
									sectionDefault.targets[n].oldElement = true;

									//fixing dimensions of new blocks in custom layout
									if (m >= 1 && jQuery.isEmptyObject(sectionCustom.targets[m].props)) {
										if (Rexbuilder_Util.activeLayout != 'default') {
											if (sectionDefault.targets[0].props.layout != sectionCustom.targets[0].props['layout']) {
												var cellWidth = parseFloat(sectionDefault.targets[0].props.grid_cell_width);
												var cellHeightMasonry = 5;
												if (sectionDefault.targets[0].props.layout == 'masonry') {
													sectionCustom.targets[m].props.gs_y = Math.round(
														(sectionDefault.targets[n].props.gs_y * cellHeightMasonry) / cellWidth
													);
													sectionCustom.targets[m].props.gs_height = Math.round(
														(sectionDefault.targets[n].props.gs_height * cellHeightMasonry) / cellWidth
													);
													sectionCustom.targets[m].props.gs_start_h = Math.round(
														(sectionDefault.targets[n].props.gs_start_h * cellHeightMasonry) / cellWidth
													);
												} else {
													sectionCustom.targets[m].props.gs_y = Math.round(
														(sectionDefault.targets[n].props.gs_y * cellWidth) / cellHeightMasonry
													);
													sectionCustom.targets[m].props.gs_height = Math.round(
														(sectionDefault.targets[n].props.gs_height * cellWidth) / cellHeightMasonry
													);
													sectionCustom.targets[m].props.gs_start_h = Math.round(
														(sectionDefault.targets[n].props.gs_start_h * cellWidth) / cellHeightMasonry
													);
												}
											}
										}
									}

									// sectionCustom.targets[m].props = _.merge(
									//   {},
									//   sectionDefault.targets[n].props,
									//   sectionCustom.targets[m].props
									// );
									sectionCustom.targets[m].props = Rexbuilder_Util.merge(
										sectionDefault.targets[n].props,
										sectionCustom.targets[m].props
									);

									break;
								}
							}
							if (!targetFounded) {
								sectionCustom.targets[m].notDisplay = true;
							}
						}

						//fixing dimensions of blocks not saved
						for (
							n = 0, tot_sectionDefault_targets = sectionDefault.targets.length;
							n < tot_sectionDefault_targets;
							n++
						) {
							if (typeof sectionDefault.targets[n].oldElement == 'undefined') {
								var newElement = jQuery.extend(true, {}, sectionDefault.targets[n]);
								if (Rexbuilder_Util.activeLayout != 'default') {
									if (sectionDefault.targets[0].props.layout != sectionCustom.targets[0].props['layout']) {
										var cellWidth = parseFloat(sectionDefault.targets[0].props.grid_cell_width);
										var cellHeightMasonry = 5;
										if (sectionDefault.targets[0].props.layout == 'masonry') {
											newElement.props.gs_y = Math.round((newElement.props.gs_y * cellHeightMasonry) / cellWidth);
											newElement.props.gs_height = Math.round(
												(newElement.props.gs_height * cellHeightMasonry) / cellWidth
											);
											newElement.props.gs_start_h = Math.round(
												(newElement.props.gs_start_h * cellHeightMasonry) / cellWidth
											);
										} else {
											newElement.props.gs_y = Math.round((newElement.props.gs_y * cellWidth) / cellHeightMasonry);
											newElement.props.gs_height = Math.round(
												(newElement.props.gs_height * cellWidth) / cellHeightMasonry
											);
											newElement.props.gs_start_h = Math.round(
												(newElement.props.gs_start_h * cellWidth) / cellHeightMasonry
											);
										}
									}
								}
								sectionCustom.targets.splice(1, 0, newElement);
							}
						}
						break;
					}
				}
			}
			if (layoutSelectedSections.length == 0) {
				layoutSelectedSections = defaultLayoutSections;
				for (i = 0, tot_layoutSelectedSections = layoutSelectedSections.length; i < tot_layoutSelectedSections; i++) {
					layoutSelectedSections[i].defaultSection = true;
				}
			}
		}

		//updaiting dom custom layout
		_createPageCustomizationsDataLive(layoutSelectedSections);

		for (i = 0, tot_layoutSelectedSections = layoutSelectedSections.length; i < tot_layoutSelectedSections; i++) {
			if (layoutSelectedSections[i].sectionFounded || Rexbuilder_Util.activeLayout == 'default') {
				if (
					((Rexbuilder_Util.activeLayout != 'default' && layoutSelectedSections[i].defaultSection) ||
						Rexbuilder_Util.activeLayout == 'default') &&
					_isMobile()
				) {
					// Setting block properties if we are on mobile, no saved
					// mobile layout exists and if the collapsing is needed
					layoutSelectedSections[i].targets[0].props.collapse_grid = true;
					layoutSelectedSections[i].targets[0].props.noMobileLayoutSaved = true;
					layoutSelectedSections[i].targets[0].props.layout = 'masonry';
					layoutSelectedSections[i].targets[0].props.fullHeight = false;

					// todo fix proposal
					// layoutSelectedSections[i].targets[0].props.gridEdited = false;
				}
			}
		}
		return jQuery.extend(true, {}, layoutSelectedSections);
	};

	/**
	 * Checks if viewport width is under collapsing width.
	 * @returns		{Boolean}		We are in mobile dimensions
	 * @since			?.?.?
	 */
	function _isMobile() {
		return Rexbuilder_Util.globalViewport.width < _plugin_frontend_settings.defaultSettings.collapseWidth;
	}

	/**
	 * Check if a CSS property and value are supported by the
	 * current browser
	 * @param {String} prop CSS property to check
	 * @param {String} value CSS value to check
	 */
	var _cssPropertyValueSupported = function (prop, value) {
		var d = document.createElement('div');
		d.style[prop] = value;
		return d.style[prop] === value;
	};

	/**
	 * Clear editing info for the sections
	 * Used at change layout
	 *
	 * @since		2.0.0
	 * @version	2.0.4		Was in Rexbuilder_Util_Editor, moved here
	 * @todo		Make it vanilla JS
	 */
	function clearSectionsEdited() {
		var sections = Array.prototype.slice.call(
			Rexbuilder_Util.rexContainer.getElementsByClassName('rexpansive_section')
		);
		var i,
			tot_sections = sections.length;
		for (i = 0; i < tot_sections; i++) {
			sections[i].setAttribute('data-rexlive-section-edited', false);
			sections[i].querySelector('.grid-stack-row').setAttribute('data-rexlive-layout-changed', false);
			var blocks = Array.prototype.slice.call(sections[i].getElementsByClassName('grid-stack-item'));
			var j,
				tot_blocks = blocks.length;
			for (j = 0; j < tot_blocks; j++) {
				blocks[j].setAttribute('data-rexlive-element-edited', false);
			}
		}
	}

	var launchEditDomLayout = function () {
		var layout = Rexbuilder_Util.chooseLayout();
		Rexbuilder_Util.edit_dom_layout(layout);
	};

	var edit_dom_layout = function (chosenLayoutName) {
		var response = {
			collapse_needed: false
		};

		// No change layout, simple resize
		if (chosenLayoutName == Rexbuilder_Util.activeLayout && chosenLayoutName == 'default') {
			if (_isMobile()) {
				if (!Rexbuilder_Util.blockGridUnder768) {
					Rexbuilder_Util.collapseAllGrids();
					response.collapse_needed = true;
				}
			} else {
				Rexbuilder_Util.removeCollapsedGrids();
			}
			return response;
		}

		Rexbuilder_Util.rexContainer.setAttribute('data-rex-layout-selected', chosenLayoutName);
		Rexbuilder_Util.activeLayout = chosenLayoutName;

		// new page or old builder page
		if (
			$rexbuilderLayoutData.children('.layouts-customizations').attr('data-empty-customizations') == 'true' &&
			$rexbuilderModelData.children('.models-customizations').attr('data-empty-models-customizations') == 'true'
		) {
			if (_isMobile()) {
				if (!Rexbuilder_Util.blockGridUnder768) {
					Rexbuilder_Util.collapseAllGrids();
					response.collapse_needed = true;
				}
			} else {
				Rexbuilder_Util.removeCollapsedGrids();
			}

			var emptySection = document.querySelector('.rexpansive_section.empty-section');
			if (emptySection) {
				// tracing empty page data
				var emptySectionData = [
					{
						section_rex_id: emptySection.getAttribute('data-rexlive-section-id'),
						targets: [
							{
								name: 'self',
								props: {}
							}
						]
					}
				];
				Rexbuilder_Util.editedDataInfo = new RexEditedData(emptySectionData);
			} else {
				// tracing data created from old builder
				var oldSections = Array.prototype.slice.call(document.getElementsByClassName('rexpansive_section'));
				var k,
					tot_oldSections = oldSections.length;
				var oldSectionsData = [];
				for (k = 0; k < tot_oldSections; k++) {
					var tempData = {};
					var sData = oldSections[k].querySelector('.section-data');

					tempData.section_rex_id = oldSections[k].getAttribute('data-rexlive-section-id');
					tempData.targets = [];
					var tempTarget = {
						name: '',
						props: {}
					};

					tempTarget.name = 'self';
					tempTarget.props.section_name = sData.getAttribute('data-section_name');
					tempTarget.props.section_nav_label = sData.getAttribute('data-section_nav_label');
					tempTarget.props.color_bg_section = sData.getAttribute('data-color_bg_section');
					tempTarget.props.color_bg_section_active = '' !== tempTarget.props.color_bg_section ? true : false;
					tempTarget.props.image_bg_section_active = sData.getAttribute('data-image_bg_section_active');
					tempTarget.props.image_bg_section = sData.getAttribute('data-image_bg_section');
					tempTarget.props.image_width = sData.getAttribute('data-image_width');
					tempTarget.props.image_height = sData.getAttribute('data-image_height');
					tempTarget.props.id_image_bg_section = sData.getAttribute('data-id_image_bg_section');
					tempTarget.props.image_size = sData.getAttribute('data-image_size');
					tempTarget.props.video_bg_id = sData.getAttribute('data-video_bg_id_section');
					tempTarget.props.video_mp4_url = sData.getAttribute('data-video_mp4_url');
					tempTarget.props.video_bg_width_section = sData.getAttribute('data-video_bg_width_section');
					tempTarget.props.video_bg_height_section = sData.getAttribute('data-video_bg_height_section');
					tempTarget.props.video_bg_url_section = sData.getAttribute('data-video_bg_url_section');
					tempTarget.props.video_bg_url_vimeo_section = sData.getAttribute('data-video_bg_url_vimeo_section');
					tempTarget.props.block_distance = sData.getAttribute('data-block_distance');
					tempTarget.props.row_separator_top = sData.getAttribute('data-row_separator_top');
					tempTarget.props.row_separator_bottom = sData.getAttribute('data-row_separator_bottom');
					tempTarget.props.row_separator_right = sData.getAttribute('data-row_separator_right');
					tempTarget.props.row_separator_left = sData.getAttribute('data-row_separator_left');
					tempTarget.props.margin = sData.getAttribute('data-margin');
					tempTarget.props.row_margin_top = sData.getAttribute('data-row_margin_top');
					tempTarget.props.row_margin_bottom = sData.getAttribute('data-row_margin_bottom');
					tempTarget.props.row_margin_right = sData.getAttribute('data-row_margin_right');
					tempTarget.props.row_margin_left = sData.getAttribute('data-row_margin_left');
					tempTarget.props.custom_classes = sData.getAttribute('data-custom_classes');
					tempTarget.props.row_overlay_color = sData.getAttribute('data-row_overlay_color');
					tempTarget.props.row_overlay_active = sData.getAttribute('data-row_overlay_active');

					tempData.targets.push(tempTarget);

					var blocksData = Array.prototype.slice.call(oldSections[k].getElementsByClassName('rexbuilder-block-data'));
					var z,
						tot_blocksData = blocksData.length;
					for (z = 0; z < tot_blocksData; z++) {
						var tempBlockTarget = {
							name: blocksData[z].getAttribute('data-rexbuilder_block_id'),
							props: {
								color_bg_block: blocksData[z].getAttribute('data-color_bg_block'),
								color_bg_block_active: blocksData[z].getAttribute('data-color_bg_block_active'),
								image_bg_url: blocksData[z].getAttribute('data-image_bg_url'),
								image_width: blocksData[z].getAttribute('data-image_width'),
								image_height: blocksData[z].getAttribute('data-image_height'),
								id_image_bg: blocksData[z].getAttribute('data-id_image_bg'),
								image_size: blocksData[z].getAttribute('data-image_size'),
								image_bg_elem_active: blocksData[z].getAttribute('data-image_bg_elem_active'),
								type_bg_image: blocksData[z].getAttribute('data-type_bg_image'),
								video_bg_id: blocksData[z].getAttribute('data-video_bg_id'),
								video_bg_width: blocksData[z].getAttribute('data-video_bg_width'),
								video_bg_height: blocksData[z].getAttribute('data-video_bg_height'),
								video_mp4_url: blocksData[z].getAttribute('data-video_mp4_url'),
								video_bg_url_youtube: blocksData[z].getAttribute('data-video_bg_url_youtube'),
								video_bg_url_vimeo: blocksData[z].getAttribute('data-video_bg_url_vimeo'),
								photoswipe: blocksData[z].getAttribute('data-photoswipe'),
								block_custom_class: blocksData[z].getAttribute('data-block_custom_class'),
								block_padding: blocksData[z].getAttribute('data-block_padding'),
								overlay_block_color: blocksData[z].getAttribute('data-overlay_block_color'),
								overlay_block_color_active: blocksData[z].getAttribute('data-overlay_block_color_active'),
								linkurl: blocksData[z].getAttribute('data-linkurl'),
								block_flex_position: blocksData[z].getAttribute('data-block_flex_position'),
								block_flex_img_position: blocksData[z].getAttribute('data-block_flex_img_position')
							}
						};
						tempData.targets.push(tempBlockTarget);
					}

					oldSectionsData.push(tempData);
				}

				Rexbuilder_Util.editedDataInfo = new RexEditedData(oldSectionsData);
			}

			return response;
		}

		var modelsIDInPage = [];
		var sectionsPage = [];

		var sections = [].slice.call(
			Rexbuilder_Util.rexContainer.querySelectorAll('.rexpansive_section:not(.removing_section)')
		);
		var sIndex,
			tot_sections = sections.length;
		var temp_secObj;
		for (sIndex = 0; sIndex < tot_sections; sIndex++) {
			// populate models ids array
			if (Rexbuilder_Util.hasClass(sections[sIndex], 'rex-model-section')) {
				modelsIDInPage.push(parseInt(sections[sIndex].getAttribute('data-rexlive-model-id')));
			}

			// populate sections object array
			temp_secObj = {
				rexID: sections[sIndex].getAttribute('data-rexlive-section-id'),
				modelID: isNaN(parseInt(sections[sIndex].getAttribute('data-rexlive-model-id')))
					? ''
					: parseInt(sections[sIndex].getAttribute('data-rexlive-model-id'))
			};
			sectionsPage.push(temp_secObj);
		}

		var i, j;

		var layoutDataPage = _getPageCustomizations();

		if (Rexbuilder_Util.activeLayout == 'default') {
			_saveCustomizationDomOrder(jQuery.extend(true, [], layoutDataPage));
		}

		var layoutDataModels = _getModelsCustomizations();
		var defaultLayoutSections;

		// first load default layout state generation
		if ($defaultLayoutState.attr('data-empty-default-customization') == 'true') {
			defaultLayoutSections = Rexbuilder_Util.getDefaultPageLayout(layoutDataPage, layoutDataModels);
			_createDefaultLayoutState(defaultLayoutSections);
		} else {
			_updateDefaultLayoutState({
				modelsData: layoutDataModels
			});
			defaultLayoutSections = _getDefaultLayoutState();
		}

		var layoutSelectedSections = Rexbuilder_Util.getCustomLayoutSections(
			layoutDataPage,
			layoutDataModels,
			defaultLayoutSections,
			chosenLayoutName
		);

		//fixing models numbers
		var modelsNumbers = [];
		var flagModel;
		for (i = 0; i < layoutSelectedSections; i++) {
			if (layoutSelectedSections[i].section_is_model.toString() == 'true') {
				flagModel = false;
				for (j = 0; j < modelsNumbers.length; j++) {
					if (modelsNumbers[j].id == layoutSelectedSections[i].section_model_id) {
						modelsNumbers[j].number = modelsNumbers[j].number + 1;
						layoutSelectedSections[i].section_model_number = modelsNumbers[j].number;
						flagModel = true;
						break;
					}
				}
				if (!flagModel) {
					layoutSelectedSections[i].section_model_number = 1;
					modelsNumbers.push({
						id: layoutSelectedSections[i].section_model_id,
						number: 1
					});
				}
			}
		}

		Rexbuilder_Util.clearSectionsEdited();

		// Not sure about the meaning of this variable
		var noCustomLayoutSaved = false;

		// guess a different layout
		// happens when the user selects a custom layout, so we must guess
		// which setting to assing to contents
		if (
			'default' !== chosenLayoutName &&
			'tablet' !== chosenLayoutName &&
			'mobile' !== chosenLayoutName &&
			null === document.querySelector('.customization-wrap[data-customization-name="' + chosenLayoutName + '"]')
		) {
			var probableLayout = guessLayout(chosenLayoutName);
			var probableLayoutSelectedSections;

			if (chosenLayoutName !== probableLayout) {
				probableLayoutSelectedSections = layoutDataPage.filter(function (layout) {
					return probableLayout === layout.name;
				});

				probableLayoutSelectedSections = probableLayoutSelectedSections[0].sections;

				noCustomLayoutSaved = true;
			} else {
				probableLayoutSelectedSections = layoutSelectedSections;
			}
		}

		var emptyLayoutData = null;

		if (noCustomLayoutSaved) {
			// Need to create a new Array with empty data, but keeping the IDs
			emptyLayoutData = layoutSelectedSections.map(function (layout) {
				var newTargets = layout.targets.map(function (target) {
					return {
						name: target.name,
						props: {}
					};
				});

				// Creating a new object with all the old properties except the 'targets' one,
				// merged with the new created targets (that has empty props)
				return _.merge(_.omit(layout, 'targets'), { targets: newTargets });
			});
		}

		// tracing page data
		// Rexbuilder_Util.editedDataInfo = new RexEditedData( ( 'undefined' === typeof probableLayout ? layoutSelectedSections : probableLayoutSelectedSections ) );
		Rexbuilder_Util.editedDataInfo = new RexEditedData(emptyLayoutData ? emptyLayoutData : layoutSelectedSections);

		var mergedEdits = _mergeSections(
			'undefined' === typeof probableLayout ? layoutSelectedSections : probableLayoutSelectedSections,
			defaultLayoutSections
		);

		// removing collapsed from grid
		Rexbuilder_Util.removeCollapsedGrids();

		Rexbuilder_Util.domUpdating = true; // edit_dom_layout
		var forceCollapseElementsGrid = false;
		var sectionDomOrder = [];

		var meIndex, section, $section;

		for (meIndex in mergedEdits) {
			var currentEdit = mergedEdits[meIndex];
			var currentID = currentEdit.section_rex_id;

			if (!currentEdit.notInSection || chosenLayoutName == 'default') {
				var sectionObj = {
					rexID: currentID,
					modelID: -1,
					modelNumber: -1
				};
				var sectionIsModel = currentEdit.section_is_model.toString() == 'true';

				if (sectionIsModel) {
					var modelID = currentEdit.section_model_id;
					var modelNumber = currentEdit.section_model_number;

					sectionObj.modelID = modelID;
					sectionObj.modelNumber = modelNumber;
					section = Rexbuilder_Util.rexContainer.querySelector(
						'section[data-rexlive-section-id="' +
							currentID +
							'"][data-rexlive-model-number="' +
							sectionObj.modelNumber +
							'"]'
					);
				} else {
					section = Rexbuilder_Util.rexContainer.querySelector('section[data-rexlive-section-id="' + currentID + '"]');
				}

				var sectionIsNotRemoving = section && !Rexbuilder_Util.hasClass(section, 'removing_section');

				if (sectionIsNotRemoving) {
					var sectionNeedsToBeHidden =
						'undefined' !== typeof currentEdit.section_hide && 'true' == currentEdit.section_hide.toString();

					if (sectionNeedsToBeHidden) {
						Rexbuilder_Util.addClass(section, 'rex-hide-section');
					} else {
						Rexbuilder_Util.removeClass(section, 'rex-hide-section');
						$section = $(section);

						// ! Really ugly thing happening here
						var result = _updateDOMelements($section, currentEdit.targets, forceCollapseElementsGrid, meIndex);
						response.collapse_needed += result;
					}

					sectionDomOrder.push(sectionObj);
				}
			}
		}

		Rexbuilder_Dom_Util.fixSectionDomOrder(sectionDomOrder, true);

		Rexbuilder_Util.domUpdating = false; // edit_dom_layout

		return response;
	};

	/**
	 * @param		{JQuery}	$section
	 * @param		{object}	targets
	 * @param		{boolean}	forceCollapseElementsGrid
	 * @param		{number}	meIndex
	 * @returns	{[type]}
	 */
	var _updateDOMelements = function ($section, targets, forceCollapseElementsGrid, meIndex) {
		var $gallery = $section.find('.grid-stack-row');
		var gallery = $gallery.get(0);
		var galleryData = $gallery.data();
		var galleryEditorInstance = galleryData.plugin_perfectGridGalleryEditor;
		var gridstackInstance;

		if (targets[0].props.gridEdited) {
			gallery.setAttribute('data-rexlive-layout-changed', true);
		}

		$section.removeClass('empty-section');
		var noBlocks = true;

		// galleryEditorInstance.batchGridstack();

		if ('undefined' !== typeof galleryData) {
			if ('undefined' !== typeof galleryEditorInstance) {
				for (var i = 1, tot_target = targets.length; i < tot_target; i++) {
					var elem = gallery.querySelector('div[data-rexbuilder-block-id="' + targets[i].name + '"]');
					if (null === elem) continue;

					var hideElement =
						typeof targets[i].props.hide == 'undefined' ? false : targets[i].props.hide.toString() == 'true';
					noBlocks *= hideElement;

					if (hideElement) {
						if (!Rexbuilder_Util.hasClass(elem, 'rex-hide-element')) {
							Rexbuilder_Util.addClass(elem, 'rex-hide-element');
							galleryEditorInstance.removeBlock(elem);
						}
					} else {
						if (Rexbuilder_Util.hasClass(elem, 'rex-hide-element')) {
							Rexbuilder_Util.removeClass(elem, 'rex-hide-element');
							galleryEditorInstance.reAddBlock($(elem));
						}
					}
				}

				// batching grid before the heights of the blocks have changed
				// so (tecnically) we see the changes on commit
				galleryEditorInstance.properties.gridstackInstance.batchUpdate();
			}
		}

		if (noBlocks) {
			$section.addClass('empty-section');
		}

		var i,
			tot_targets = targets.length;
		var targetName, targetProps;
		var $elem, $itemData, $itemContent;
		var elem;
		var inlineImgs, tot_inlineImgs;
		for (i = 1; i < tot_targets; i++) {
			if (!targets[i].notDisplay || Rexbuilder_Util.activeLayout == 'default') {
				targetName = targets[i].name;
				targetProps = targets[i].props;

				$elem = $gallery.find('.perfect-grid-item[data-rexbuilder-block-id="' + targetName + '"]');
				elem = $elem[0];
				$itemData = $elem.children('.rexbuilder-block-data');
				$itemContent = $elem.find('.grid-item-content');

				if ($elem.length > 0) {
					inlineImgs = [].slice.call(elem.getElementsByTagName('img'));
					tot_inlineImgs = inlineImgs.length;

					if (!Rexbuilder_Util.editorMode && 0 !== tot_inlineImgs) {
						var j;

						for (j = 0; j < tot_inlineImgs; j++) {
							if ('true' === inlineImgs[j].getAttribute('inline-photoswipe')) {
								Rexbuilder_Photoswipe.addElementFromInline($(inlineImgs[j]));
							}
						}
					}

					var options = {
						$elem: $elem,
						targetProps: targetProps,
						$itemData: $itemData,
						$itemContent: $itemContent,
						gridstackInstance: Rexbuilder_Util.editorMode ? galleryEditorInstance.properties.gridstackInstance : null,
						positionAndSize: true
					};

					Rexbuilder_Util.updateDOMSingleElement(options);
				}
			}
		}

		updateSection($section, $gallery, targets[0].props, forceCollapseElementsGrid);
		if (Rexbuilder_Util.editorMode) {
			updateSectionTools($section, $gallery, targets[0].props, forceCollapseElementsGrid);
		}

		var collapse =
			typeof targets[0].props.collapse_grid == 'undefined'
				? false
				: targets[0].props.collapse_grid.toString() == 'true' || forceCollapseElementsGrid;

		if ('undefined' !== typeof galleryData) {
			if ('undefined' !== typeof galleryEditorInstance) {
				if (
					'undefined' !== typeof galleryEditorInstance.properties.gridstackInstance &&
					galleryEditorInstance.properties.gridstackInstance
				) {
					Rexbuilder_Util.domUpdating = true; // updateDOMElements

					galleryEditorInstance.properties.gridstackInstance.commit();
					//waiting for gridstack updating blocks dimensions with saved data
					// var handlingGridstackCommitEndTi = setTimeout( handlingGridstackCommitEnd.bind(null, galleryEditorInstance, collapse, targets, meIndex), 300 );
					handlingGridstackCommitEnd(galleryEditorInstance, collapse, targets, meIndex);
				}
			}
		}

		// galleryEditorInstance.commitGridstack();

		return collapse;
	};

	function handlingGridstackCommitEnd(galleryEditorInstance, collapse, targets, meIndex) {
		Rexbuilder_Util.domUpdating = true; // handlingGridstackCommitEnd
		// galleryEditorInstance.batchGridstack();
		if (galleryEditorInstance.properties.gridstackInstance) {
			galleryEditorInstance.properties.gridstackInstance.batchUpdate();
		}
		galleryEditorInstance.fixBlockDomOrder();
		galleryEditorInstance.saveStateGrid();
		//updaiting blocks height for masonry
		if (galleryEditorInstance.settings.galleryLayout == 'masonry' && !collapse) {
			galleryEditorInstance.updateBlocksHeight();
		} else if (
			galleryEditorInstance.settings.galleryLayout == 'fixed' &&
			galleryEditorInstance.settings.fullHeight.toString() == 'true'
		) {
			galleryEditorInstance.updateFullHeight();
		}

		// Collapsing blocks if needed
		if (targets[0].props.collapse_grid) {
			galleryEditorInstance.collapseElements();
			galleryEditorInstance.collapseElementsProperties();
		}

		// must use this launcher
		if (galleryEditorInstance.properties.gridstackInstance) {
			galleryEditorInstance.properties.gridstackInstance.commit();
		}

		// row ready
		var handlingRowReadyTi = setTimeout(
			handlingRowReady.bind(null, galleryEditorInstance, meIndex, targets[0].props.collapse_grid),
			200
		);
		// var handlingRowReadyTi = setTimeout( handlingRowReady.bind( null, galleryEditorInstance, meIndex ), 0 );
		edlTimeouts.push(handlingRowReadyTi);

		// galleryEditorInstance.commitGridstack();
	}

	function handlingRowReady(galleryEditorInstance, meIndex, isCollapse) {
		Rexbuilder_Util.domUpdating = false; // handlingRowReady
		galleryEditorInstance.properties.dispositionBeforeCollapsing = galleryEditorInstance.createActionDataMoveBlocksGrid();
		galleryEditorInstance._createFirstReverseStack();
		galleryEditorInstance._fixImagesDimension();
		if (Rexbuilder_Util.editorMode) {
			galleryEditorInstance._updateElementsSizeViewers();
		}

		// callback after fixing a row
		handlingRowReadyEnd(meIndex);

		if (!isCollapse) {
			setTimeout(Rexbuilder_Util.fixYoutube.bind(null, galleryEditorInstance.section), 1500);
		}
	}

	/**
	 * Updating a single block element according to the saved info.
	 * @param		{Object}	options						contains the following parameters
	 *
	 * The options param contains the following params:
	 * @param		{jQuery}	$elem							block to edit
	 * @param		{Object}	targetProps				block properties
	 * @param		{jQuery}	$itemData					properties object
	 * @param		{jQuery}	$itemContent			block content
	 * @param		{Object}	gridstackInstance	grid instance
	 * @param		{Object}	positionAndSize		need updating position and size of the block
	 * @since		2.0.0
	 * @version	2.0.4			Switched parameters in options Object and added collapsing handling
	 */
	function updateDOMSingleElement(options) {
		var $elem = options.$elem;
		var elem = $elem.get(0);
		var targetProps = options.targetProps;
		var $itemData = options.$itemData;
		var itemData = $itemData.get(0);
		var $itemContent = options.$itemContent;
		var gridstackInstance = options.gridstackInstance;
		var positionAndSize = options.positionAndSize || false;
		var collapseGrid = options.collapseGrid || false;

		// Update block position and size
		if (positionAndSize) {
			/** @todo Need to check forceCollapseElementsGrid too? */
			/*
			 * Collapsing handling. Needed only if there's a mobile layout saved in DB because
			 * if not, data are already ok (they're changed in function _mergeSections)
			 */
			if (collapseGrid) {
				// Block width
				elem.setAttribute('data-gs-width', 12);
				elem.setAttribute('data-width', 12);
				itemData.setAttribute('data-gs_width', 12);
				itemData.setAttribute('data-size_x', 12);
				targetProps['gs_width'] = '12';
				targetProps['size_x'] = '12';

				// Block position
				elem.setAttribute('data-gs-x', 0);
				elem.setAttribute('data-row', 1);
				itemData.setAttribute('data-gs_x', 0);
				itemData.setAttribute('data-row', 1);
				targetProps['gs_x'] = '0';
				targetProps['row'] = '1';
			}

			var positionDataActive = {
				x: elem.getAttribute('data-gs-x'),
				y: elem.getAttribute('data-gs-y'),
				w: elem.getAttribute('data-gs-width'),
				h: elem.getAttribute('data-gs-height'),
				startH: itemData.getAttribute('data-gs_start_h'),
				// increaseHeight: itemData.getAttribute("data-element_height_increased"),
				realFluid: itemData.getAttribute('data-element_real_fluid')
			};

			var positionData = {
				x: typeof targetProps['gs_x'] == 'undefined' ? positionDataActive.x : targetProps['gs_x'],
				y: typeof targetProps['gs_y'] == 'undefined' ? positionDataActive.y : targetProps['gs_y'],
				w: typeof targetProps['gs_width'] == 'undefined' ? positionDataActive.w : targetProps['gs_width'],
				h: typeof targetProps['gs_height'] == 'undefined' ? positionDataActive.h : targetProps['gs_height'],
				startH: typeof targetProps['gs_start_h'] == 'undefined' ? positionDataActive.startH : targetProps['gs_start_h'],
				// increaseHeight: typeof targetProps["element_height_increased"] == "undefined"
				//   ? positionDataActive.increaseHeight
				//   : targetProps["element_height_increased"],
				realFluid:
					typeof targetProps['element_real_fluid'] == 'undefined'
						? positionDataActive.realFluid
						: targetProps['element_real_fluid'],
				gridstackInstance: gridstackInstance
			};

			updateElementDimensions($elem[0], $itemData[0], positionData);
		}

		// Update block video
		var mp4ID = !isNaN(parseInt(targetProps['video_bg_id'])) ? parseInt(targetProps['video_bg_id']) : '';
		var youtubeUrl =
			typeof targetProps['video_bg_url_youtube'] == 'undefined' ? '' : targetProps['video_bg_url_youtube'];
		var vimeoUrl = typeof targetProps['video_bg_url_vimeo'] == 'undefined' ? '' : targetProps['video_bg_url_vimeo'];
		var type = '';

		if (mp4ID != '') {
			type = 'mp4';
		} else if (vimeoUrl != '') {
			type = 'vimeo';
		} else if (youtubeUrl != '') {
			type = 'youtube';
		}

		var videoOptions = {
			mp4Data: {
				idMp4: mp4ID,
				linkMp4: typeof targetProps['video_mp4_url'] == 'undefined' ? '' : targetProps['video_mp4_url'],
				width: !isNaN(parseInt(targetProps['video_bg_width'])) ? parseInt(targetProps['video_bg_width']) : '',
				height: !isNaN(parseInt(targetProps['video_bg_height'])) ? parseInt(targetProps['video_bg_height']) : ''
			},
			vimeoUrl: vimeoUrl,
			youtubeUrl: youtubeUrl,
			audio:
				typeof targetProps['video_has_audio'] == 'undefined'
					? ''
					: targetProps['video_has_audio'] == '1' || targetProps['video_has_audio'].toString() == 'true'
					? true
					: false,
			typeVideo: type
		};

		Rexbuilder_Dom_Util.updateVideos($itemContent, videoOptions);

		// Update block image
		var activeImage =
			typeof targetProps['image_bg_elem_active'] == 'undefined'
				? true
				: targetProps['image_bg_elem_active'].toString() == 'true';

		var imageOptions = {
			active: activeImage,
			idImage: activeImage
				? !isNaN(parseInt(targetProps['id_image_bg']))
					? parseInt(targetProps['id_image_bg'])
					: ''
				: '',
			urlImage: activeImage ? targetProps['image_bg_url'] : '',
			width: activeImage
				? !isNaN(parseInt(targetProps['image_width']))
					? parseInt(targetProps['image_width'])
					: ''
				: '',
			height: activeImage
				? !isNaN(parseInt(targetProps['image_height']))
					? parseInt(targetProps['image_height'])
					: ''
				: '',
			typeBGimage: activeImage ? targetProps['type_bg_image'] : '',
			photoswipe: activeImage ? targetProps['photoswipe'] : ''
		};

		Rexbuilder_Dom_Util.updateImageBG($itemContent, imageOptions);

		// Update block background
		var bgColorOpt = {
			$elem: $elem,
			color: 'undefined' !== typeof targetProps['color_bg_block'] ? targetProps['color_bg_block'] : '',
			active:
				typeof targetProps['color_bg_block_active'] == 'undefined'
					? true
					: targetProps['color_bg_block_active'].toString()
		};

		if (-1 === bgColorOpt.color.indexOf('gradient')) {
			Rexbuilder_Dom_Util.updateBlockBackgroundColor(bgColorOpt);
		} else {
			Rexbuilder_Dom_Util.updateBlockBackgroundGradient(bgColorOpt);
		}

		// Update block overlay
		var overlayBlockOpt = {
			$elem: $elem,
			color: 'undefined' !== typeof targetProps['overlay_block_color'] ? targetProps['overlay_block_color'] : '',
			active:
				typeof targetProps['overlay_block_color_active'] == 'undefined'
					? false
					: targetProps['overlay_block_color_active'].toString()
		};

		if (-1 === overlayBlockOpt.color.indexOf('gradient')) {
			Rexbuilder_Dom_Util.updateBlockOverlay(overlayBlockOpt);
		} else {
			Rexbuilder_Dom_Util.updateBlockOverlayGradient(overlayBlockOpt);
		}

		// Update block padding
		Rexbuilder_Dom_Util.updateBlockPaddings(
			$elem,
			_getPaddingsDataString(typeof targetProps['block_padding'] != 'undefined' ? targetProps['block_padding'] : '')
		);

		// Update block custom classes
		var newClasses = typeof targetProps['block_custom_class'] == 'undefined' ? '' : targetProps['block_custom_class'];
		var classList = [];
		if (newClasses != '') {
			newClasses = newClasses.trim();
			classList = newClasses.split(/\s+/);
		}
		Rexbuilder_Dom_Util.updateCustomClasses($elem, classList);

		// Update block content position
		var pos =
			typeof targetProps['block_flex_position'] != 'undefined' ? targetProps['block_flex_position'].split(' ') : '';

		var flexPosition = {
			x: pos[0],
			y: pos[1]
		};

		Rexbuilder_Dom_Util.updateFlexPostition($elem, flexPosition);

		// Update block image position
		var pos =
			typeof targetProps['block_flex_img_position'] != 'undefined'
				? targetProps['block_flex_img_position'].split(' ')
				: '';
		var imgFlexPosition = {
			x: pos[0],
			y: pos[1]
		};
		Rexbuilder_Dom_Util.updateImageFlexPostition($elem, imgFlexPosition);

		var sliderRatio =
			typeof targetProps['slider_dimension_ratio'] == 'undefined' ? '' : targetProps['slider_dimension_ratio'];
		$itemData.attr('data-slider_ratio', sliderRatio);

		var blockRatio = typeof targetProps['block_ratio'] == 'undefined' ? '' : targetProps['block_ratio'];
		$itemData.attr('data-block_ratio', blockRatio);

		var blockEdited =
			typeof targetProps['block_dimensions_live_edited'] == 'undefined'
				? ''
				: targetProps['block_dimensions_live_edited'];
		$itemData.attr('data-block_dimensions_live_edited', blockEdited);

		var hideBlock =
			typeof targetProps['hide'] == 'undefined' ? false : targetProps['hide'].toString() == 'true' ? true : false;

		if (hideBlock) {
			if (!$elem.hasClass('rex-hide-element')) {
				$elem.addClass('rex-hide-element');
			}
			Rexbuilder_Util.stopBlockVideos($elem);
		} else {
			if ($elem.hasClass('rex-hide-element')) {
				$elem.removeClass('rex-hide-element');
			}
			Rexbuilder_Util.playBlockVideos($elem);
		}

		var elementEdited =
			typeof targetProps['element_edited'] == 'undefined'
				? false
				: targetProps['element_edited'].toString() == 'true'
				? true
				: false;
		$elem.attr('data-rexlive-element-edited', elementEdited);

		for (var propName in targetProps) {
			switch (propName) {
				case 'type':
					$itemData.attr('data-type', targetProps['type']);
					break;

				case 'size_x':
					$elem.attr('data-width', targetProps['size_x']);
					break;

				case 'size_y':
					$elem.attr('data-height', targetProps['size_y']);
					break;

				case 'row':
					$elem.attr('data-row', targetProps['row']);
					break;

				case 'col':
					$elem.attr('data-col', targetProps['col']);
					break;
				case 'photoswipe':
					if (!Rexbuilder_Util.editorMode) {
						if ('' === targetProps['linkurl'] && targetProps['photoswipe'] == 'true') {
							Rexbuilder_Photoswipe.addElement(
								$itemContent,
								targetProps['image_bg_url'],
								parseInt(targetProps['image_width']),
								parseInt(targetProps['image_height']),
								targetProps['image_size']
							);
							var $section = $elem.parents('.rexpansive_section');
							$section.addClass('photoswipe-gallery');
						} else {
							Rexbuilder_Photoswipe.removeElement($itemContent);
						}
					}
					$itemData.attr('data-photoswipe', targetProps['photoswipe']);

					break;
				case 'linkurl':
					if (!Rexbuilder_Util.editorMode) {
						var $linkEl = $itemContent.parents('.element-link');
						if (targetProps['linkurl'] != '') {
							if ($linkEl.length != 0) {
								$linkEl.attr('href', targetProps['linkurl']);
								$linkEl.attr('title', targetProps['linkurl']);
							} else {
								var $itemContentParent = $itemContent.parent();
								tmpl.arg = 'link';
								// $itemContentParent.append(
								//   tmpl("tmpl-link-block", {
								//     url: targetProps["linkurl"]
								//   })
								// );
								$itemContentParent.append(
									'<a class="element-link hovered" href="' +
										targetProps['linkurl'] +
										'" title="' +
										targetProps['linkurl'] +
										'"></a>'
								);
								var $link = $itemContentParent.children('.element-link');
								$itemContent.detach().appendTo($link);
							}
						} else {
							if ($linkEl.length != 0) {
								$linkEl.children().unwrap();
							}
						}
					}
					Rexbuilder_Dom_Util.updateBlockUrl($elem, targetProps['linkurl']);
					break;
				case 'zak_background':
				case 'zak_side':
				case 'zak_title':
				case 'zak_icon':
				case 'zak_foreground':
					break;
				case 'block_animation':
					break;
				case 'block_has_scrollbar':
					break;
				default:
					break;
			}
		}
	}

	/**
	 * Define the default measures for a block to inseret inside a specific Section
	 * In particular caluclate the height for masonry
	 * @param {string} sectionRexID section ID
	 * @return {object} measures
	 */
	var _getDefaultBlockMeasure = function (sectionRexID) {
		sectionRexID = 'undefined' !== typeof sectionRexID ? sectionRexID : '';
		var defs = {
			defDefaultWidth: 3,
			defDefaultHeight: 4,
			defMobileWidth: 12,
			defMobileHeight: null
		};

		if ('' !== sectionRexID) {
			var $layouts = $pageCustomizationsDataDiv.find('.customization-wrap');

			$layouts.each(function (i, el) {
				var $l = $(el);
				var thisLayout = el.getAttribute('data-customization-name');
				var setts = JSON.parse($l.find('.section-targets[data-section-rex-id=' + sectionRexID + ']').text());
				for (var j = 0, tot_setts = setts.length; j < tot_setts; j++) {
					if (setts[j].name === 'self') {
						switch (setts[j].props.layout) {
							case 'masonry':
								if ('mobile' == thisLayout) {
									defs.defMobileHeight = 52;
								} else {
									defs.defDefaultHeight = Math.ceil((setts[j].props.grid_cell_width * 4) / 5);
								}
								break;
							case 'fixed':
								if ('mobile' == thisLayout) {
									defs.defMobileHeight = 4;
								} else {
									defs.defDefaultHeight = 4;
								}
								break;
							default:
						}
						break;
					}
				}
			});
		}

		// No mobile definition, means a default section masonry
		if (!defs.defMobileHeight) {
			defs.defMobileHeight = 52;
		}

		return defs;
	};

	var _updateModelsLive = function (idModel, targets, editedModelNumber) {
		Rexbuilder_Util.domUpdating = true; // _updateModelsLive
		var sections = [].slice.call(Rexbuilder_Util.rexContainer.getElementsByClassName('rexpansive_section'));
		var i,
			tot_sections = sections.length;
		var $section;

		for (i = 0; i < tot_sections; i++) {
			if (
				sections[i].getAttribute('data-rexlive-model-id') == idModel &&
				sections[i].getAttribute('data-rexlive-model-number') != editedModelNumber
			) {
				$section = $(sections[i]);
				_updateDOMelements($section, targets, false);
			}
		}

		Rexbuilder_Util.domUpdating = false; // _updateModelsLive
	};

	var _saveCustomizationDomOrder = function (pageCustomizations) {
		var i, j, tot_pageCustomizations, tot_pageCustomizations_sections;
		$layoutsDomOrder.children().remove();
		var sections = [];
		for (i = 0, tot_pageCustomizations = pageCustomizations.length; i < tot_pageCustomizations; i++) {
			var divLayout = document.createElement('script');
			Rexbuilder_Util.addClass(divLayout, 'layout-sections');
			divLayout.setAttribute('data-rex-layout-name', pageCustomizations[i].name);

			sections = [];
			for (
				j = 0, tot_pageCustomizations_sections = pageCustomizations[i].sections.length;
				j < tot_pageCustomizations_sections;
				j++
			) {
				sections.push(pageCustomizations[i].sections[j]);
			}

			divLayout.textContent = JSON.stringify(sections);
			$(divLayout).appendTo($layoutsDomOrder[0]);
		}
	};

	/**
	 * Get page default layout order
	 * @returns {Object}
	 * @since 2.0.10
	 */
	var _getPageDefaultDom = function() {
		var $defaultLayout = $layoutsDomOrder.children('.layout-sections[data-rex-layout-name="default"]')
		return {
			name: 'default',
			sections: JSON.parse($defaultLayout.text())
		}
	}

	var _getPageCustomizationsDom = function () {
		var customizations = [];
		$layoutsDomOrder.children('.layout-sections:not([data-rex-layout-name="default"])').each(function (i, layout) {
			var $layout = $(layout);
			customizations.push({
				name: $layout.attr('data-rex-layout-name'),
				sections: JSON.parse($layout.text())
			});
		});
		return customizations;
	};

	var _updatePageCustomizationsDomOrder = function (layoutsData) {
		for (var i = 0, tot_layoutsData = layoutsData.length; i < tot_layoutsData; i++) {
			$layoutsDomOrder
				.children('.layout-sections[data-rex-layout-name="' + layoutsData[i].name + '"]')
				.text(JSON.stringify(layoutsData[i].sections));
		}
	};

	var _getPageAvaiableLayoutsNames = function () {
		return JSON.parse($availableLayoutNames.text());
	};

	var _getLayoutLiveSectionTargets = function ($section) {
		var targets = [];
		if ($section.hasClass('rex-model-section')) {
			var modelID = $section.attr('data-rexlive-model-id');
			$liveDataContainer.children().each(function (i, sec) {
				var $sec = $(sec);
				if (modelID == $sec.attr('data-model-id')) {
					targets = JSON.parse($sec.text());
					return false;
				}
			});
		} else {
			var rexID = $section.attr('data-rexlive-section-id');
			$liveDataContainer.children().each(function (i, sec) {
				var $sec = $(sec);
				if (rexID == $sec.attr('data-section-rex-id')) {
					targets = JSON.parse($sec.text());
					return false;
				}
			});
		}

		return targets;
	};

	/**
	 * Applyes default layout blocks dimensions
	 * @param {Object} $section
	 * @param {Object} blocks
	 * @param {Object} galleryLayout
	 */
	var _applyDefaultBlocksDimentions = function ($section, elemetsDisposition, galleryLayout) {
		var defaultData = _getDefaultLayoutState();
		var sectionID = $section.attr('data-rexlive-section-id');
		for (var i = 0, total_setions = defaultData.length; i < total_setions; i++) {
			if (sectionID == defaultData[i].section_rex_id) {
				var sectionDefaultData = defaultData[i];
				var targets = sectionDefaultData.targets;
				galleryLayout.layout = targets[0].props.layout;
				galleryLayout.fullHeight = targets[0].props.full_height;
				galleryLayout.collapsed =
					typeof targets[0].props.collapsed === 'undefined' ? false : targets[0].props.collapsed;
				for (var j = 1, total_blocks = elemetsDisposition.length; j < total_blocks; j++) {
					for (var k = 0, total_default_blocks = targets.length; k < total_default_blocks; k++) {
						var currentEl = elemetsDisposition[j];
						if (currentEl.name == targets[k].name) {
							currentEl.props.gs_x = targets[k].props.gs_x;
							currentEl.props.gs_y = targets[k].props.gs_y;
							currentEl.props.gs_width = targets[k].props.gs_width;
							currentEl.props.gs_height = targets[k].props.gs_height;
							currentEl.props.gs_start_h = targets[k].props.gs_start_h;
						}
					}
				}
				break;
			}
		}

		// return "Happy!";
	};

	var _createDefaultLayoutState = function (sectionsData) {
		$defaultLayoutState.children().remove();
		var i;
		var tot_sectionsData;
		for (i = 0, tot_sectionsData = sectionsData.length; i < tot_sectionsData; i++) {
			var $div = $(document.createElement('script'));
			$div.addClass('section-targets');
			$div.attr('data-section-rex-id', sectionsData[i].section_rex_id);
			$div.attr('data-model-id', sectionsData[i].section_model_id);
			$div.attr('data-model-number', sectionsData[i].section_model_number);
			$div.attr('data-section-hide', sectionsData[i].section_hide);
			$div.text(JSON.stringify(sectionsData[i].targets));
			$div.appendTo($defaultLayoutState[0]);
		}
		$defaultLayoutState.removeAttr('data-empty-default-customization');
	};

	var _updateDefaultLayoutState = function (data) {
		var updatedSectionsData = typeof data.pageData == 'undefined' ? [] : data.pageData;
		var modelsData = typeof data.modelsData == 'undefined' ? [] : data.modelsData;
		var p, q, r;
		var tot_modelsData_customizations, tot_updatedSectionsData, tot_modelsData;
		if (updatedSectionsData.length == 0) {
			$defaultLayoutState.children('.section-targets').each(function (j, sectionTargetsElem) {
				var $sectionTargetsElem = $(sectionTargetsElem);
				var modelID = isNaN(parseInt($sectionTargetsElem.attr('data-model-id')))
					? -1
					: parseInt($sectionTargetsElem.attr('data-model-id'));
				if (modelID != -1) {
					for (q = 0; q < modelsData.length; q++) {
						if (modelID == modelsData[q].id) {
							for (
								r = 0, tot_modelsData_customizations = modelsData[q].customizations.length;
								r < tot_modelsData_customizations;
								r++
							) {
								if (modelsData[q].customizations[r].name == 'default') {
									$sectionTargetsElem.text(JSON.stringify(modelsData[q].customizations[r].targets));
									break;
								}
							}
							break;
						}
					}
				}
			});
		} else {
			$defaultLayoutState.children('.section-targets').remove();
			for (p = 0, tot_updatedSectionsData = updatedSectionsData.length; p < tot_updatedSectionsData; p++) {
				var $div = $(document.createElement('script'));
				$div.addClass('section-targets');
				$div.attr('data-section-rex-id', updatedSectionsData[p].section_rex_id);
				$div.attr('data-model-id', updatedSectionsData[p].section_model_id);
				$div.attr('data-model-number', updatedSectionsData[p].section_model_number);
				$div.attr('data-section-hide', updatedSectionsData[p].section_hide);
				if (updatedSectionsData[p].section_model_id == '' || updatedSectionsData[p].section_model_id == -1) {
					$div.text(JSON.stringify(updatedSectionsData[p].targets));
				} else {
					if (updatedSectionsData[p].section_model_id != -1) {
						for (q = 0, tot_modelsData = modelsData.length; q < tot_modelsData; q++) {
							if (updatedSectionsData[p].section_model_id == modelsData[q].id) {
								for (
									r = 0, tot_modelsData_customizations = modelsData[q].customizations.length;
									r < tot_modelsData_customizations;
									r++
								) {
									if (modelsData[q].customizations[r].name == 'default') {
										$div.text(JSON.stringify(modelsData[q].customizations[r].targets));
										break;
									}
								}
								break;
							}
						}
					}
				}
				$div.appendTo($defaultLayoutState[0]);
			}
		}
	};

	var _updateDefaultLayoutStateDOMOrder = function (newOrder) {
		var data = _getDefaultLayoutState();
		newOrder = jQuery.extend(true, [], newOrder);

		var i, j;
		var tot_newOrder, tot_models, tot_data;
		var flagNumbers;
		var models = [];
		for (i = 0, tot_newOrder = newOrder.length; i < tot_newOrder; i++) {
			if (newOrder[i].modelID != -1) {
				flagNumbers = false;
				for (j = 0, tot_models = models.length; j < tot_models; j++) {
					if (models[j].id == newOrder[i].modelID) {
						models[j].number = models[j].number + 1;
						newOrder[i].modelNumber = models[j].number;
						flagNumbers = true;
						break;
					}
				}
				if (!flagNumbers) {
					models.push({
						id: newOrder[i].modelID,
						number: 1
					});
					newOrder[i].modelNumber = 1;
				}
			}
		}

		var newData = [];
		var section;
		for (i = 0, tot_newOrder = newOrder.length; i < newOrder; i++) {
			for (j = 0, tot_data = data.length; j < tot_data; j++) {
				if (newOrder[i].modelID != -1) {
					if (
						newOrder[i].modelID == data[j].section_model_id &&
						newOrder[i].modelNumber == data[j].section_model_number
					) {
						section = data.splice(j, 1);
					}
				} else {
					if (newOrder[i].rexID == data[j].section_rex_id) {
						section = data.splice(j, 1);
					}
				}
			}
			newData.push(section[0]);
		}

		_updateDefaultLayoutState({ pageData: newData });
	};

	var _updateDefaultLayoutStateSection = function ($section, position) {
		var section = $section[0]; // todo: get me as Element

		position = typeof position == 'undefined' ? -1 : position;
		Rexbuilder_Dom_Util.fixModelNumbers();
		var layoutData = Rex_Save_Listeners.createTargets($section, Rexbuilder_Util.activeLayout);
		var sectionAdded = false;

		if (hasClass(section, 'rex-model-section')) {
			var modelID = section.getAttribute('data-rexlive-model-id');
			var modelNumber = section.getAttribute('data-rexlive-section-number');
			var sectionTargets = [].slice.call($defaultLayoutState[0].getElementsByClassName('section-targets'));
			var tot_sectionTargets = sectionTargets.length,
				i;
			for (i = 0; i < tot_sectionTargets; i++) {
				// [].slice.call( $defaultLayoutState[0].getElementsByClassName( 'section-targets' ) ).forEach( function(el) {
				if (modelID == sectionTargets[i].getAttribute('data-model-id')) {
					sectionTargets[i].textContent = JSON.stringify(layoutData);
					if (modelNumber == sectionTargets[i].getAttribute('data-model-number')) {
						sectionAdded = true;
					}
				}
			}

			// $defaultLayoutState.children(".section-targets").each(function(i, sec) {
			//   var $sec = $(sec);
			//   if (modelID == $sec.attr("data-model-id")) {
			//     $sec.text(JSON.stringify(layoutData));
			//     if (modelNumber == $sec.attr("data-model-number")) {
			//       sectionAdded = true;
			//     }
			//   }
			// });
		} else {
			var rexID = section.getAttribute('data-rexlive-section-id');
			var sectionTargets = [].slice.call($defaultLayoutState[0].getElementsByClassName('section-targets'));
			var tot_sectionTargets = sectionTargets.length,
				i;
			for (i = 0; i < tot_sectionTargets; i++) {
				// [].slice.call( $defaultLayoutState[0].getElementsByClassName( 'section-targets' ) ).forEach( function(el) {
				if (rexID == sectionTargets[i].getAttribute('data-section-rex-id')) {
					sectionTargets[i].textContent = JSON.stringify(layoutData);
					sectionAdded = true;
				}
			}

			// $defaultLayoutState.children(".section-targets").each(function(i, sec) {
			//   var $sec = $(sec);
			//   if (rexID == $sec.attr("data-section-rex-id")) {
			//     $sec.text(JSON.stringify(layoutData));
			//     sectionAdded = true;
			//   }
			// });
		}

		if (!sectionAdded) {
			var section_props = {
				section_rex_id: section.getAttribute('data-rexlive-section-id'),
				section_is_model: false,
				section_model_id: '',
				section_model_number: -1,
				section_hide: false
			};

			section_props.section_hide = hasClass(section, 'rex-hide-section');

			if (hasClass(section, 'rex-model-section')) {
				section_props.section_is_model = true;
				section_props.section_model_id = section.getAttribute('data-rexlive-model-id');
				section_props.section_model_number = section.getAttribute('data-rexlive-model-number');
			}

			var div = document.createElement('script');
			addClass(div, 'section-targets');
			div.setAttribute('data-section-rex-id', section_props.section_rex_id);
			div.setAttribute('data-model-id', section_props.section_model_id);
			div.setAttribute('data-model-number', section_props.section_model_number);
			div.setAttribute('data-section-hide', section_props.section_hide);
			div.textContent = JSON.stringify(layoutData);
			var $div = $(div);

			// var $div = $(document.createElement("script"));
			// $div.addClass("section-targets");
			// $div.attr("data-section-rex-id", section_props.section_rex_id);
			// $div.attr("data-model-id", section_props.section_model_id);
			// $div.attr("data-model-number", section_props.section_model_number);
			// $div.attr("data-section-hide", section_props.section_hide);
			// $div.text(JSON.stringify(layoutData));
			if (position == -1) {
				$div.appendTo($defaultLayoutState[0]);
			} else {
				var $selectedSection;
				position = position - 1;
				$defaultLayoutState.children('.section-targets').each(function (i, sec) {
					if (i == position) {
						$selectedSection = $(sec);
						return false;
					}
				});
				$selectedSection.after($div[0]);
			}
		}
	};

	// gets default layout
	var _getDefaultLayoutState = function () {
		var defaultLayoutSections = [];

		$defaultLayoutState.children('.section-targets').each(function (j, sectionTargetsElem) {
			var $sectionTargetsElem = $(sectionTargetsElem);
			var sectionRexID = $sectionTargetsElem.attr('data-section-rex-id');
			var modelID = isNaN(parseInt($sectionTargetsElem.attr('data-model-id')))
				? -1
				: parseInt($sectionTargetsElem.attr('data-model-id'));
			var modelNumber = isNaN(parseInt($sectionTargetsElem.attr('data-model-number')))
				? -1
				: parseInt($sectionTargetsElem.attr('data-model-number'));
			var hideSection =
				typeof $sectionTargetsElem.attr('data-section-hide') == 'undefined'
					? false
					: $sectionTargetsElem.attr('data-section-hide').toString() == '1'
					? true
					: false;
			var targets = $sectionTargetsElem.text() != '' ? JSON.parse($sectionTargetsElem.text()) : [];

			defaultLayoutSections.push({
				section_rex_id: sectionRexID,
				section_model_id: modelID != -1 ? modelID : '',
				section_model_number: modelNumber != -1 ? modelNumber : '',
				section_is_model: modelID != -1,
				section_hide: hideSection,
				targets: targets
			});
		});
		return defaultLayoutSections;
	};

	var _updateSectionOrderCustomLayouts = function (sectionMoved, newOrder) {
		var layoutsOrder = Rexbuilder_Util.getPageCustomizationsDom();
		var moveSection;
		var newSecPosition;
		var i, j;
		var tot_newOrder, tot_layoutsOrder, tot_layoutsOrder_sections;
		for (i = 0, tot_newOrder = newOrder.length; i < tot_newOrder; i++) {
			if (
				newOrder[i].rexID == sectionMoved.rexID &&
				newOrder[i].modelNumber == sectionMoved.modelNumber &&
				newOrder[i].modelID == sectionMoved.modelID
			) {
				newSecPosition = i;
				break;
			}
		}

		for (i = 0, tot_layoutsOrder = layoutsOrder.length; i < tot_layoutsOrder; i++) {
			moveSection = false;
			for (j = 0, tot_layoutsOrder_sections = layoutsOrder[i].sections.length; j < tot_layoutsOrder_sections; j++) {
				if (layoutsOrder[i].sections[j].section_is_model) {
					if (
						layoutsOrder[i].sections[j].section_model_id == sectionMoved.modelID &&
						layoutsOrder[i].sections[j].section_model_number == sectionMoved.modelNumber
					) {
						if (
							typeof layoutsOrder[i].sections[j].section_created_live !== 'undefined' &&
							layoutsOrder[i].sections[j].section_created_live.toString() == 'true'
						) {
							moveSection = true;
						}
						break;
					}
				} else {
					if (sectionMoved.rexID == layoutsOrder[i].sections[j].section_rex_id) {
						if (
							typeof layoutsOrder[i].sections[j].section_created_live !== 'undefined' &&
							layoutsOrder[i].sections[j].section_created_live.toString() == 'true'
						) {
							moveSection = true;
						}
						break;
					}
				}
			}
			if (moveSection) {
				var oldsec = layoutsOrder[i].sections.splice(j, 1)[0];
				layoutsOrder[i].sections.splice(newSecPosition, 0, oldsec);
			}
		}
		Rexbuilder_Util.updatePageCustomizationsDomOrder(layoutsOrder);
	};

	var _updateSectionStateLive = function ($section) {
		Rexbuilder_Dom_Util.fixModelNumbers();
		var layoutData = Rex_Save_Listeners.createTargets($section, Rexbuilder_Util.activeLayout);
		var sectionAdded = false;
		if ($section.hasClass('rex-model-section')) {
			var modelID = $section.attr('data-rexlive-model-id');
			$liveDataContainer.children().each(function (i, sec) {
				var $sec = $(sec);
				if (modelID == $sec.attr('data-model-id')) {
					$sec.text(JSON.stringify(layoutData));
					sectionAdded = true;
				}
			});
		} else {
			var rexID = $section.attr('data-rexlive-section-id');
			$liveDataContainer.children().each(function (i, sec) {
				var $sec = $(sec);
				if (rexID == $sec.attr('data-section-rex-id')) {
					$sec.text(JSON.stringify(layoutData));
					sectionAdded = true;
				}
			});
		}

		if (!sectionAdded) {
			var section_props = {
				section_rex_id: $section.attr('data-rexlive-section-id'),
				section_is_model: false,
				section_model_id: '',
				section_model_number: -1,
				section_hide: false
			};

			section_props.section_hide = $section.hasClass('rex-hide-section');

			if ($section.hasClass('rex-model-section')) {
				section_props.section_is_model = true;
				section_props.section_model_id = $section.attr('data-rexlive-model-id');
				section_props.section_model_number = $section.attr('data-rexlive-model-number');
			}

			var $div = $(document.createElement('script'));
			$div.addClass('section-targets');
			$div.attr('data-section-rex-id', section_props.section_rex_id);
			$div.attr('data-model-id', section_props.section_model_id);
			$div.attr('data-model-number', section_props.section_model_number);
			$div.attr('data-section-hide', section_props.section_hide);
			$div.text(JSON.stringify(layoutData));
			$div.appendTo($liveDataContainer[0]);
		}
	};

	var _getGridLayoutLive = function ($section) {
		var targets;
		var gridLayout = {
			layout: 'fixed',
			fullHeight: false,
			collapsed: false
		};

		if ($section.hasClass('rex-model-section')) {
			var modelID = $section.attr('data-rexlive-model-id');
			$liveDataContainer.children('.section-targets').each(function (i, sec) {
				var $sec = $(sec);
				if (modelID == $sec.attr('data-model-id')) {
					targets = JSON.parse($sec.text());
				}
			});
		} else {
			var rexID = $section.attr('data-rexlive-section-id');
			$liveDataContainer.children('.section-targets').each(function (i, sec) {
				var $sec = $(sec);
				if (rexID == $sec.attr('data-section-rex-id')) {
					targets = JSON.parse($sec.text());
				}
			});
		}

		// if ( -1 !== targets[0].props['custom_classes'].indexOf('rex-block-grid') ) {
		//   targets[0].props['collapse_grid'] = false;
		// }

		gridLayout.layout = targets[0].props['layout'];
		gridLayout.fullHeight = targets[0].props['full_height'];
		gridLayout.collapsed = targets[0].props['collapse_grid'];
		return gridLayout;
	};

	var _getLayoutSectionTargets = function ($section, layoutName) {
		layoutName = typeof layoutName === 'undefined' ? 'default' : layoutName;
		var targets = [];
		var i, j;
		var tot_layoutDataModels, tot_layoutDataModels_customizations, tot_layoutDataPage, tot_layoutDataPage_sections;

		if ($section.hasClass('rex-model-section')) {
			var modelID = $section.attr('data-rexlive-model-id');
			var layoutDataModels = _getModelsCustomizations();

			for (i = 0, tot_layoutDataModels = layoutDataModels.length; i < tot_layoutDataModels; i++) {
				if (layoutDataModels[i].id == modelID) {
					for (
						j = 0, tot_layoutDataModels_customizations = layoutDataModels[i].customizations.length;
						j < tot_layoutDataModels_customizations;
						j++
					) {
						if (layoutDataModels[i].customizations[j].name == layoutName) {
							targets = jQuery.extend(true, [], layoutDataModels[i].customizations[j].targets);
							break;
						}
					}
					break;
				}
			}
		} else {
			var rexID = $section.attr('data-rexlive-section-id');
			var layoutDataPage = _getPageCustomizations();

			for (i = 0, tot_layoutDataPage = layoutDataPage.length; i < tot_layoutDataPage; i++) {
				if (layoutDataPage[i].name == layoutName && typeof layoutDataPage[i].sections !== 'undefined') {
					for (
						j = 0, tot_layoutDataPage_sections = layoutDataPage[i].sections.length;
						j < tot_layoutDataPage_sections;
						j++
					) {
						if (layoutDataPage[i].sections[j].section_rex_id == rexID) {
							targets = jQuery.extend(true, [], layoutDataPage[i].sections[j].targets);
							break;
						}
					}
					break;
				}
			}
		}
		return targets;
	};

	var _getDefaultBlockProps = function ($section, blockRexID) {
		var defaultTargets = _getLayoutSectionTargets($section, 'default');
		var i;
		var tot_defaultTargets;
		var blockProps = {};
		for (i = 1, tot_defaultTargets = defaultTargets.length; i < tot_defaultTargets; i++) {
			if (defaultTargets[i].name == blockRexID) {
				blockProps = jQuery.extend(true, {}, defaultTargets[i].props);
				break;
			}
		}
		return blockProps;
	};

	var _getGridLayout = function ($section, layoutName) {
		layoutName = typeof layoutName === 'undefined' ? 'default' : layoutName;
		var gridLayout = {
			layout: 'fixed',
			fullHeight: false,
			collapsed: false
		};

		var i, j;
		var tot_layoutDataModels, tot_layoutDataModels_customizations, tot_layoutDataPage, tot_layoutDataPage_sections;

		if ($section.hasClass('rex-model-section')) {
			var modelID = $section.attr('data-rexlive-model-id');
			var layoutDataModels = _getModelsCustomizations();

			for (i = 0, tot_layoutDataModels = layoutDataModels.length; i < tot_layoutDataModels; i++) {
				if (layoutDataModels[i].id == modelID) {
					for (
						j = 0, tot_layoutDataModels_customizations = layoutDataModels[i].customizations.length;
						j < tot_layoutDataModels_customizations;
						j++
					) {
						if (layoutDataModels[i].customizations[j].name == layoutName) {
							gridLayout.layout = layoutDataModels[i].customizations[j].targets[0].props['layout'];
							gridLayout.fullHeight = layoutDataModels[i].customizations[j].targets[0].props['full_height'];
							gridLayout.collapsed = layoutDataModels[i].customizations[j].targets[0].props['collapse_grid'];
							break;
						}
					}
					break;
				}
			}
		} else {
			var rexID = $section.attr('data-rexlive-section-id');
			var layoutDataPage = _getPageCustomizations();

			for (i = 0, tot_layoutDataPage = layoutDataPage.length; i < tot_layoutDataPage; i++) {
				if (
					layoutDataPage[i].name == layoutName &&
					typeof layoutDataPage[i].sections !== 'undefined' &&
					typeof layoutDataPage[i].sections !== null
				) {
					for (
						j = 0, tot_layoutDataPage_sections = layoutDataPage[i].sections.length;
						j < tot_layoutDataPage_sections;
						j++
					) {
						if (layoutDataPage[i].sections[j].section_rex_id == rexID) {
							if (layoutDataPage[i].sections[j].targets.length != 0) {
								gridLayout.layout = layoutDataPage[i].sections[j].targets[0].props['layout'];
								gridLayout.fullHeight = layoutDataPage[i].sections[j].targets[0].props['full_height'];
								gridLayout.collapsed = layoutDataPage[i].sections[j].targets[0].props['collapse_grid'];
							}
							break;
						}
					}
					break;
				}
			}
		}

		return gridLayout;
	};

	var _customizationExists = function (layoutName) {
		var exists = false;
		var i;
		var tot_layoutsNamesAvaiable;

		var layoutsNamesAvaiable = [];

		if ($availableLayoutNames.text() != '') {
			layoutsNamesAvaiable = JSON.parse($availableLayoutNames.text());
		}

		for (i = 0, tot_layoutsNamesAvaiable = layoutsNamesAvaiable.length; i < tot_layoutsNamesAvaiable; i++) {
			if (layoutsNamesAvaiable[i] == layoutName) {
				exists = true;
				break;
			}
		}

		return exists;
	};

	var updateSection = function ($section, $gallery, targetProps, forceCollapseElementsGrid) {
		var $sectionData = $section.children('.section-data');

		var mp4ID = !isNaN(parseInt(targetProps['video_bg_id'])) ? parseInt(targetProps['video_bg_id']) : '';
		var youtubeUrl =
			typeof targetProps['video_bg_url_section'] == 'undefined' ? '' : targetProps['video_bg_url_section'];
		var vimeoUrl =
			typeof targetProps['video_bg_url_vimeo_section'] == 'undefined' ? '' : targetProps['video_bg_url_vimeo_section'];
		var type = '';

		if (mp4ID != '') {
			type = 'mp4';
		} else if (vimeoUrl != '') {
			type = 'vimeo';
		} else if (youtubeUrl != '') {
			type = 'youtube';
		}

		var hasAudio =
			'undefined' !== targetProps['custom_classes']
				? -1 !== targetProps['custom_classes'].indexOf('rex-video--with-audio')
					? true
					: false
				: false;

		var videoOptions = {
			mp4Data: {
				idMp4: mp4ID,
				linkMp4: typeof targetProps['video_mp4_url'] == 'undefined' ? '' : targetProps['video_mp4_url'],
				width: typeof targetProps['video_bg_width_section'] == 'undefined' ? '' : targetProps['video_bg_width_section'],
				height:
					typeof targetProps['video_bg_height_section'] == 'undefined' ? '' : targetProps['video_bg_height_section']
			},
			vimeoUrl: vimeoUrl,
			youtubeUrl: youtubeUrl,
			audio: hasAudio,
			typeVideo: type
		};

		// if ( Rexbuilder_Util.editorMode ) {
		Rexbuilder_Dom_Util.updateSectionVideoBackground($section, videoOptions);
		// }

		var imageOptions = {
			active:
				typeof targetProps['image_bg_section_active'] == 'undefined'
					? true
					: targetProps['image_bg_section_active'].toString(),
			idImage: isNaN(parseInt(targetProps['id_image_bg_section'])) ? '' : parseInt(targetProps['id_image_bg_section']),
			urlImage: targetProps['image_bg_section'],
			width: parseInt(targetProps['image_width']),
			height: parseInt(targetProps['image_height'])
		};

		var sectionOverlay = {
			color: targetProps['row_overlay_color'],
			active:
				typeof targetProps['row_overlay_active'] == 'undefined' ? false : targetProps['row_overlay_active'].toString()
		};

		// if ( Rexbuilder_Util.editorMode ) {
		Rexbuilder_Dom_Util.updateImageBG($section, imageOptions);
		// }

		var backgroundColorOpt = {
			color: 'undefined' !== typeof targetProps['color_bg_section'] ? targetProps['color_bg_section'] : '',
			active:
				typeof targetProps['color_bg_section_active'] == 'undefined'
					? true
					: targetProps['color_bg_section_active'].toString()
		};

		if (-1 === backgroundColorOpt.color.indexOf('gradient')) {
			Rexbuilder_Dom_Util.updateSectionBackgroundColor($section, backgroundColorOpt);
		} else {
			Rexbuilder_Dom_Util.updateSectionBackgroundGradient($section, backgroundColorOpt);
		}

		if (-1 === sectionOverlay.color.indexOf('gradient')) {
			Rexbuilder_Dom_Util.updateSectionOverlay($section, sectionOverlay);
		} else {
			Rexbuilder_Dom_Util.updateSectionOverlayGradient($section, sectionOverlay);
		}

		var margins = {
			top: isNaN(parseInt(targetProps['row_margin_top'])) ? 0 : parseInt(targetProps['row_margin_top']),
			right: isNaN(parseInt(targetProps['row_margin_right'])) ? 0 : parseInt(targetProps['row_margin_right']),
			bottom: isNaN(parseInt(targetProps['row_margin_bottom'])) ? 0 : parseInt(targetProps['row_margin_bottom']),
			left: isNaN(parseInt(targetProps['row_margin_left'])) ? 0 : parseInt(targetProps['row_margin_left'])
		};

		Rexbuilder_Dom_Util.updateSectionMarginsData($section, margins);

		if (-1 !== targetProps['custom_classes'].indexOf('rex-block-grid')) {
			targetProps['collapse_grid'] = false;
			targetProps['layout'] = $sectionData.attr('data-layout');
		}

		var rowSettings = {
			gutter: targetProps['block_distance'],
			top: targetProps['row_separator_top'],
			bottom: targetProps['row_separator_bottom'],
			right: targetProps['row_separator_right'],
			left: targetProps['row_separator_left'],

			full_height: targetProps['full_height'],
			layout: targetProps['layout'],

			section_width: targetProps['section_width'],
			dimension: targetProps['dimension'],

			collapse_grid:
				typeof targetProps['collapse_grid'] == 'undefined'
					? false
					: targetProps['collapse_grid'].toString() == 'true' || forceCollapseElementsGrid,

			noMobileLayoutSaved: !!targetProps.noMobileLayoutSaved
		};

		Rexbuilder_Dom_Util.updateRow($section, $sectionData, $gallery, rowSettings);

		var newName = typeof targetProps['section_name'] == 'undefined' ? '' : targetProps['section_name'];
		Rexbuilder_Dom_Util.updateSectionName($section, newName);
		$section.attr('data-type', targetProps['type']);

		var newClasses = typeof targetProps['custom_classes'] == 'undefined' ? '' : targetProps['custom_classes'];

		var classList = [];
		if (newClasses != '') {
			newClasses = newClasses.trim();
			classList = newClasses.split(/\s+/);
		}
		Rexbuilder_Dom_Util.updateCustomClasses($section, classList);

		var sectionEdited =
			typeof targetProps['section_edited'] == 'undefined'
				? false
				: targetProps['section_edited'].toString() == 'true'
				? true
				: false;
		$section.attr('data-rexlive-section-edited', sectionEdited);
	};

	/**
	 * Updating the tools of a row, just in case
	 * @param {jQuery Object} $section section
	 * @param {jQuery Object} $gallery gallery
	 * @param {JS Oject} targetProps all section properties
	 * @param {bool} forceCollapseElementsGrid force collapsing info
	 */
	var updateSectionTools = function ($section, $gallery, targetProps, forceCollapseElementsGrid) {
		var margins = {
			top: isNaN(parseInt(targetProps['row_margin_top'])) ? 0 : parseInt(targetProps['row_margin_top']),
			right: isNaN(parseInt(targetProps['row_margin_right'])) ? 0 : parseInt(targetProps['row_margin_right']),
			bottom: isNaN(parseInt(targetProps['row_margin_bottom'])) ? 0 : parseInt(targetProps['row_margin_bottom']),
			left: isNaN(parseInt(targetProps['row_margin_left'])) ? 0 : parseInt(targetProps['row_margin_left'])
		};

		Rexbuilder_Section.fixSectionToolbox($section, margins);

		if (-1 !== targetProps['custom_classes'].indexOf('rex-block-grid')) {
			targetProps['collapse_grid'] = false;
		}

		var rowSettings = {
			gutter: targetProps['block_distance'],
			top: targetProps['row_separator_top'],
			bottom: targetProps['row_separator_bottom'],
			right: targetProps['row_separator_right'],
			left: targetProps['row_separator_left'],

			full_height: targetProps['full_height'],
			layout: targetProps['layout'],

			section_width: targetProps['section_width'],
			dimension: targetProps['dimension'],

			collapse_grid:
				typeof targetProps['collapse_grid'] == 'undefined'
					? false
					: targetProps['collapse_grid'].toString() == 'true' || forceCollapseElementsGrid
		};

		Rexbuilder_Section.fixBlockToolsAccordingToSeparator($section, rowSettings);
	};

	/**
	 * Update element data dimensions and position
	 *
	 * @since 2.0.0
	 * @date 11-07-2019 Rewrite for vanilla JS
	 */
	var updateElementDimensions = function (elem, elemData, posData) {
		var x = parseInt(posData.x);
		var y = parseInt(posData.y);
		var w = parseInt(posData.w);
		var h = parseInt(posData.h);
		var startH = parseInt(posData.startH);
		var increaseHeight = parseInt(posData.increaseHeight);
		var realFluid = parseInt(posData.realFluid);

		if ('undefined' !== typeof posData.gridstackInstance && posData.gridstackInstance) {
			posData.gridstackInstance.update(elem, x, y, w, h);
		} else {
			elem.setAttribute('data-gs-height', h);
			elem.setAttribute('data-gs-width', w);
			elem.setAttribute('data-gs-y', y);
			elem.setAttribute('data-gs-x', x);
		}
		elemData.setAttribute('data-gs_start_h', startH);
		elemData.setAttribute('data-gs_width', w);
		elemData.setAttribute('data-gs_height', h);
		elemData.setAttribute('data-gs_y', y);
		elemData.setAttribute('data-gs_x', x);
		elemData.setAttribute('data-element_real_fluid', realFluid);
	};

	// function to detect if we are on a mobile device
	var _detect_mobile = function () {
		if (!('ontouchstart' in document.documentElement)) {
			// document.documentElement.className += " no-touch";
			Rexbuilder_Util.addClass(document.body, 'no-touch');
		} else {
			// document.documentElement.className += " touch";
			Rexbuilder_Util.addClass(document.body, 'touch');
		}
	};

	// function to detect the viewport size
	var _viewport = function () {
		var e = window,
			a = 'inner';
		if (!('innerWidth' in window)) {
			a = 'client';
			e = document.documentElement || document.body;
		}
		return { width: e[a + 'Width'], height: e[a + 'Height'] };
	};

	var _merge = function (obj1, obj2) {
		// Variables
		var target = {};
		var deep = false;
		var i = 0;
		// Merge the object into the target object
		var merger = function (obj) {
			for (var prop in obj) {
				if (obj.hasOwnProperty(prop)) {
					if (Object.prototype.toString.call(obj[prop]) === '[object Object]') {
						// If we're doing a deep merge
						// and the property is an object
						target[prop] = merge(target[prop], obj[prop]);
					} else {
						// Otherwise, do a regular merge
						target[prop] = obj[prop];
					}
				}
			}
		};

		merger(obj1);
		merger(obj2);

		return target;
	};

	// function to find the youtube id based on an url
	var getYoutubeID = function (url) {
		var ID;
		if (url.indexOf('youtu.be') > 0) {
			ID = url.substr(url.lastIndexOf('/') + 1, url.length);
		} else if (url.indexOf('http') > -1) {
			ID = url.match(/[\\?&]v=([^&#]*)/)[1];
		} else {
			ID = url.length > 15 ? null : url;
		}
		return ID;
	};

	var _checkPresentationPage = function () {
		if (0 !== $('.rexpansive_portfolio_presentation').length) {
			return true;
		}
		return false;
	};

	var _checkStaticPresentationPage = function () {
		if (0 !== $('.rexpansive-static-portfolio').length) {
			return true;
		}
		return false;
	};

	var _checkPost = function () {
		if (0 !== $('#rex-article').length) {
			return true;
		}
		return false;
	};

	// find the animation/transition event names
	var _whichTransitionEvent = function () {
		var t,
			el = document.createElement('fakeelement');

		var transitions = {
			transition: 'transitionend',
			OTransition: 'oTransitionEnd',
			MozTransition: 'transitionend',
			WebkitTransition: 'webkitTransitionEnd'
		};

		for (t in transitions) {
			if (el.style[t] !== undefined) {
				return transitions[t];
			}
		}
	};

	var _whichAnimationEvent = function () {
		var t,
			el = document.createElement('fakeelement');

		var animations = {
			animation: 'animationend',
			OAnimation: 'oAnimationEnd',
			MozAnimation: 'animationend',
			WebkitAnimation: 'webkitAnimationEnd'
		};

		for (t in animations) {
			if (el.style[t] !== undefined) {
				return animations[t];
			}
		}
	};

	/**
	 * Function launched at the end of the resize of the window
	 * @since 2.0.0
	 */
	var doneResizing = function () {
		Rexbuilder_Util.windowIsResizing = true;
		// if (Rexbuilder_Util.editorMode && !Rexbuilder_Util_Editor.changedLayout) {
		//   Rexbuilder_Util.windowIsResizing = false;
		//   return;
		// }

		// Live editor resize logic
		if (Rexbuilder_Util.editorMode) {
			// If layout changed
			if (Rexbuilder_Util_Editor.changedLayout) {
				Rexbuilder_Util_Editor.changedLayout = false;
				var resize_info = edit_dom_layout(Rexbuilder_Util_Editor.clickedLayoutID);

				if (0 === resize_info.collapse_needed) {
					Rexbuilder_Util_Editor.endLoading();
				} else {
					Rexbuilder_Util.$document.one('rexlive:collapsingElementsEnded', function (e) {
						Rexbuilder_Util_Editor.endLoading();
					});
				}
			} else {
				if ('default' === Rexbuilder_Util.chosenLayoutData.id) {
					_updateGridsHeights();
				}
				Rexbuilder_Util.windowIsResizing = false;
				return;
			}
		}

		Rexbuilder_Util.windowIsResizing = false;
		Rexbuilder_Util.loadWidth = Rexbuilder_Util.globalViewport.width;
	};

	/**
	 * Set the internal initial grid state for every row
	 * based on the actual active customization
	 * @param {string} layout Layout active
	 * @since 2.0.0
	 */
	var _set_initial_grids_state = function (layout) {
		layout = 'undefined' !== typeof layout ? layout : 'default';
		if (Rexbuilder_Util.rexContainer) {
			var rows = [].slice.call(Rexbuilder_Util.rexContainer.getElementsByClassName('rexpansive_section'));
			var tot_rows = rows.length,
				j;
			for (j = 0; j < tot_rows; j++) {
				var $row = $(rows[j]);
				var $grid = $row.find('.grid-stack-row');
				var galleryEditorInstance = $grid.data().plugin_perfectGridGalleryEditor;
				var rowCustomizations = Rexbuilder_Util.getSectionCustomLayouts(
					rows[j].getAttribute('data-rexlive-section-id')
				);
				var index = null;
				var tempIndex = null;

				// Searching for the available layout of this row
				for (var i = 0; i < rowCustomizations.length; i++) {
					if (rowCustomizations[i].name === 'default') {
						tempIndex = i;
					}
					if (rowCustomizations[i].name === layout) {
						index = i;
						break;
					}
					if (i == rowCustomizations.length - 1) {
						index = tempIndex;
					}
				}

				// generation grid state
				var state = [];
				for (
					var i = 0, tot_rowCustomizations_targets = rowCustomizations[index].targets.length;
					i < tot_rowCustomizations_targets;
					i++
				) {
					if ('self' !== rowCustomizations[index].targets[i].name) {
						var temp = {};
						temp.el = $row.find(
							'.perfect-grid-item[data-rexbuilder-block-id=' + rowCustomizations[index].targets[i].name + ']'
						);
						temp.x = parseInt(rowCustomizations[index].targets[i].props.gs_x);
						temp.y = parseInt(rowCustomizations[index].targets[i].props.gs_y);
						temp.width = parseInt(rowCustomizations[index].targets[i].props.gs_width);
						temp.height = parseInt(rowCustomizations[index].targets[i].props.gs_height);
						state.push(temp);
					}
				}

				galleryEditorInstance.set_grid_initial_state(state);
			}
		}
	};

	/**
	 * Updating the height of the boxes inside all the sections.
	 * At the end, launches an event to the document
	 * @return {null}
	 * @since  2.0.0
	 */
	var _updateGridsHeights = function () {
		if (!Rexbuilder_Util.rexContainer) return;

		var rows = [].slice.call(Rexbuilder_Util.rexContainer.getElementsByClassName('grid-stack-row'));
		var tot_rows = rows.length,
			i;
		var $row, galleryEditorInstance;
		for (i = 0; i < tot_rows; i++) {
			$row = $(rows[i]);
			galleryEditorInstance = $row.data().plugin_perfectGridGalleryEditor;
			if (galleryEditorInstance !== undefined) {
				galleryEditorInstance.batchGridstack();
				galleryEditorInstance._defineDynamicPrivateProperties();
				galleryEditorInstance.updateGridstackStyles();
				galleryEditorInstance.setFullWidthNaturalBackground();
				galleryEditorInstance.setNaturalBackground();
				galleryEditorInstance.updateBlocksHeight();
				galleryEditorInstance.commitGridstack();
			}

			// Triggering event after a row resize
			var ev = jQuery.Event('rexlive:updateGridsHeights');
			ev.settings = {
				$row: $row
			};
			Rexbuilder_Util.$document.trigger(ev);
		}
	};

	var _stopBlockVideos = function ($elem) {
		_stopVideo($elem.find('.grid-item-content'));
	};
	var _playBlockVideos = function ($elem) {
		_playVideoFromBegin($elem.find('.grid-item-content'));
	};

	var _stopPluginsSection = function ($section) {
		var $mp4Videos = $section.find('.mp4-player');
		var $vimeoVideos = $section.find('.vimeo-player');
		var $youtubeVideos = $section.find('.youtube-player');

		$.each($mp4Videos, function (i, video) {
			Rexbuilder_Util.stopVideo($(video));
		});

		$.each($vimeoVideos, function (i, video) {
			Rexbuilder_Util.stopVideo($(video));
		});

		$.each($youtubeVideos, function (i, video) {
			Rexbuilder_Util.stopVideo($(video));
		});
	};

	var _playPluginsSection = function ($section) {
		var $mp4Videos = $section.find('.mp4-player');
		var $vimeoVideos = $section.find('.vimeo-player');
		var $youtubeVideos = $section.find('.youtube-player');

		if (Rexbuilder_Util.editorMode) {
			$.each($mp4Videos, function (i, video) {
				Rexbuilder_Util.playVideoFromBegin($(video));
			});
		}

		$.each($vimeoVideos, function (i, video) {
			Rexbuilder_Util.playVideoFromBegin($(video));
		});

		$.each($youtubeVideos, function (i, video) {
			Rexbuilder_Util.playVideoFromBegin($(video));
		});
	};

	var _stopVideo = function ($target) {
		if ($target.hasClass('mp4-player')) {
			var mp4video = $target.children('.rex-video-wrap').find('video')[0];
			mp4video.currentTime = 0;
			mp4video.pause();
		} else if ($target.hasClass('vimeo-player')) {
			var maybePlayer = VimeoVideo.findVideo($target.children('.rex-video-vimeo-wrap').find('iframe')[0]);
			if (maybePlayer) {
				maybePlayer.unload();
			}
		} else if ($target.hasClass('youtube-player')) {
			if ($target.children('.rex-youtube-wrap').YTPGetPlayer() === undefined) {
				return;
			}
			$target.children('.rex-youtube-wrap').YTPStop();
		}
	};

	var _fixVideosAudioSection = function ($section) {
		var $mp4Videos = $section.find('.mp4-player');
		var $vimeoVideos = $section.find('.vimeo-player');
		var $youtubeVideos = $section.find('.youtube-player');

		Rexbuilder_Util.fixVideoAudio($section);
		$.each($mp4Videos, function (i, video) {
			Rexbuilder_Util.fixVideoAudio($(video));
		});

		$.each($vimeoVideos, function (i, video) {
			Rexbuilder_Util.fixVideoAudio($(video));
		});

		$.each($youtubeVideos, function (i, video) {
			Rexbuilder_Util.fixVideoAudio($(video));
		});
	};

	var _fixYoutube = function (section) {
		var youtubeVideos = [].slice.call(section.getElementsByClassName('rex-youtube-wrap'));
		var i,
			tot_youtubeVideos = youtubeVideos.length;

		for (i = 0; i < tot_youtubeVideos; i++) {
			var ytpObj = $(youtubeVideos[i]);
			var $toggle = ytpObj.parents('.youtube-player').eq(0).children('.rex-video-toggle-audio');
			var ytpPlayer = ytpObj.YTPGetPlayer();
			if (ytpPlayer !== undefined) {
				ytpObj.optimizeDisplay();
				ytpObj.YTPPlay();
				if ($toggle.length != 0 && !$toggle.hasClass('user-has-muted')) {
					ytpObj.YTPUnmute();
				} else {
					ytpPlayer.mute();
					ytpPlayer.isMute = true;
					ytpPlayer.setVolume(0);
				}
			}
		}
	};

	var _fixVideoAudio = function ($target) {
		var $toggle = $target.children('rex-video-toggle-audio');
		if ($target.hasClass('mp4-player')) {
			var mp4video = $target.children('.rex-video-wrap').find('video')[0];
			if ($toggle.length != 0 && !$toggle.hasClass('user-has-muted')) {
				$(mp4video).prop('muted', false);
			} else {
				$(mp4video).prop('muted', true);
			}
		} else if ($target.hasClass('vimeo-player')) {
			var vimPlayer = VimeoVideo.findVideo($target.children('.rex-video-vimeo-wrap').find('iframe')[0]);
			if ($toggle.length != 0 && !$toggle.hasClass('user-has-muted')) {
				vimPlayer.setVolume(1);
			} else {
				if (vimPlayer) {
					vimPlayer.setVolume(0);
				}
			}
		} else if ($target.hasClass('youtube-player')) {
			var ytpObj = $target.children('.rex-youtube-wrap');
			var ytpPlayer = ytpObj.YTPGetPlayer();
			if (ytpPlayer !== undefined) {
				if ($toggle.length != 0 && !$toggle.hasClass('user-has-muted')) {
					ytpObj.YTPUnmute();
				} else {
					ytpPlayer.mute();
					ytpPlayer.isMute = true;
					ytpPlayer.setVolume(0);
				}
			}
		}
	};

	var _playVideoFromBegin = function ($target) {
		var hasVideo = false;
		if ($target.hasClass('mp4-player')) {
			var mp4video = $target.children('.rex-video-wrap').find('video')[0];
			mp4video.currentTime = 0;
			mp4video.play();
			hasVideo = true;
		} else if ($target.hasClass('vimeo-player')) {
			var vimPlayer = VimeoVideo.findVideo($target.children('.rex-video-vimeo-wrap').find('iframe')[0]);
			if (null !== vimPlayer) {
				vimPlayer.play();
			}
			hasVideo = true;
		} else if ($target.hasClass('youtube-player')) {
			var ytpObj = $target.children('.rex-youtube-wrap');
			if (ytpObj.length != 0) {
				var ytpPlayer = ytpObj.YTPGetPlayer();
				if (ytpPlayer === undefined) {
					return;
				}
				ytpObj.YTPPlay();
			} else {
				return;
			}
			hasVideo = true;
		}

		if (hasVideo) {
			setTimeout(Rexbuilder_Util.fixVideoAudio.bind(null, $target), 500);
		}
	};

	var setContainer = function ($container) {
		this.$rexContainer = $container;
	};

	/**
	 * Search for parent ancestor element
	 * @param  {Node}
	 * @param  {String}
	 * @return {Node|null}
	 */
	var _parents = function (el, selector) {
		while (el.parentNode) {
			if (_matches(el, selector)) {
				return el;
			}
			el = el.parentNode;
		}
		return null;
	};

	/**
	 * Checks if an element matches a selector class
	 * @param  {Node}
	 * @param  {String}
	 * @return {Boolean}
	 */
	var _matches = function (el, selector) {
		return (
			el.matches ||
			el.matchesSelector ||
			el.msMatchesSelector ||
			el.mozMatchesSelector ||
			el.webkitMatchesSelector ||
			el.oMatchesSelector
		).call(el, selector);
	};

	var _transitionEvent = '';
	var _animationEvent = '';

	function _smoothScroll($target) {
		$bodyHtml.animate(
			{
				scrollTop: $target.offset().top + _plugin_frontend_settings.scroll_animation_offset
			},
			600
		);
	}

	function getGalleryInstance($element) {
		var elementIsSection = $element.is('.rexpansive_section');

		if (!elementIsSection) {
			$element = $element.parents('.rexpansive_section');
		}

		var $gridStackRow = $element.find('.grid-stack-row');

		if ($gridStackRow.length == 0) {
			return null;
		}

		return $gridStackRow.data('plugin_perfectGridGalleryEditor');
	};

	var removeCollapsedGrids = function () {
		if (!Rexbuilder_Util.rexContainer) {
			return;
		}

		if (!Rexbuilder_Util.galleryPluginActive) {
			return;
		}

		var rows = [].slice.call(Rexbuilder_Util.rexContainer.getElementsByClassName('rexpansive_section'));
		var tot_rows = rows.length,
			i;
		for (i = 0; i < tot_rows; i++) {
			var galleryInstance = getGalleryInstance($(rows[i]));
			Rexbuilder_Dom_Util.collapseGrid(
				galleryInstance,
				false,
				galleryInstance.properties.dispositionBeforeCollapsing,
				galleryInstance.properties.layoutBeforeCollapsing
			);
		}
	};

	var collapseAllGrids = function () {
		if (!Rexbuilder_Util.rexContainer) {
			return;
		}

		if (!Rexbuilder_Util.galleryPluginActive) {
			return;
		}

		var rows = [].slice.call(Rexbuilder_Util.rexContainer.getElementsByClassName('rexpansive_section'));
		var tot_rows = rows.length,
			i;
		for (i = 0; i < tot_rows; i++) {
			var galleryInstance = getGalleryInstance($(rows[i]));
			galleryInstance._defineDynamicPrivateProperties();
			galleryInstance.collapseElements();
		}
	};

	/**
	 * @param		{JQuery}	$target
	 * @version	2.0.8			Added functionality for mp4 videos
	 */
	function startVideoPlugin($target) {
		if ($target.hasClass('mp4-player')) {
			var $videoContainer = $target.find('.rex-video-wrap');
			/** @type {HTMLMediaElement} */
			var videoWrapper = $videoContainer.children('.rex-video-container').get(0);

			$videoContainer.removeClass('removing-video-mp4');

			videoWrapper.play().catch(function catchError(err) {
				Rexbuilder_Util.displayError('An error occurred while trying to play the video.');
				console.error(err);
			});
		} else if ($target.hasClass('vimeo-player')) {
			var vimeoFrame = $target.children('.rex-video-vimeo-wrap').find('iframe')[0];
			var opt = {
				autoplay: true,
				background: true,
				loop: true
			};
			VimeoVideo.addPlayer('1', vimeoFrame, opt);
		} else if ($target.hasClass('youtube-player')) {
			if ($target.children('.rex-youtube-wrap').YTPGetPlayer() === undefined) {
				$target.children('.rex-youtube-wrap').YTPlayer();
			}
		}
	}

	var _destroyVideo = function ($target, detachDom) {
		var type = '';
		if ($target.hasClass('mp4-player')) {
			type = 'mp4';
			Rexbuilder_Dom_Util.removeMp4Video($target, detachDom);
		} else if ($target.hasClass('vimeo-player')) {
			type = 'vimeo';
			Rexbuilder_Dom_Util.removeVimeoVideo($target, detachDom);
		} else if ($target.hasClass('youtube-player')) {
			type = 'youtube';
			Rexbuilder_Dom_Util.removeYoutubeVideo($target, detachDom);
		}
		return type;
	};

	var _pauseVideo = function ($target) {
		if ($target.hasClass('mp4-player')) {
			$target.children('.rex-video-wrap').find('video')[0].pause();
		} else if ($target.hasClass('vimeo-player')) {
			var vimeoPlugin = VimeoVideo.findVideo($target.find('.rex-video-vimeo-wrap').find('iframe')[0]);
			vimeoPlugin.pause();
		} else if ($target.hasClass('youtube-player')) {
			if ($target.children('.rex-youtube-wrap').YTPGetPlayer() === undefined) {
				return;
			}
			$target.children('.rex-youtube-wrap').YTPPause();
		}
	};

	/**
	 * Launch youtube and vimeo videos
	 * @return {[type]} [description]
	 */
	var _launchVideoPlugins = function () {
		if (!Rexbuilder_Util.rexContainer || 'undefined' === typeof Rexbuilder_Util.rexContainer) return;
		var ytVideos = [].slice.call(Rexbuilder_Util.rexContainer.getElementsByClassName('rex-youtube-wrap'));
		var i,
			tot_ytVideos = ytVideos.length;
		var $ytVideo, data_yt, url, id;

		if (!jQuery.browser.mobile) {
			for (i = 0; i < tot_ytVideos; i++) {
				$ytVideo = $(ytVideos[i]);
				if (
					$ytVideo.YTPGetPlayer() === undefined &&
					!Rexbuilder_Util.hasClass(ytVideos[i], 'youtube-player-launching')
				) {
					$ytVideo.YTPlayer();
					return;
				}
				Rexbuilder_Util.removeClass(ytVideos[i], 'youtube-player-launching');
			}
		} else {
			for (i = 0; i < tot_ytVideos; i++) {
				data_yt = eval('(' + ytVideos[i].getAttribute('data-property') + ')');
				url = data_yt.videoURL;
				id = getYoutubeID(url);

				ytVideos[i].style.backgroundImage = 'url(https://img.youtube.com/vi/' + id + '/0.jpg)';
				ytVideos[i].addEventListener('click', handleYtbVideoMobileClick);
			}
		}

		VimeoVideo.init();
	};

	function handleYtbVideoMobileClick(ev) {
		ev.preventDefault();

		var data_yt = eval('(' + this.getAttribute('data-property') + ')');
		var url = data_yt.videoURL;

		window.location.href = url;
	}

	/**
	 * todo to finish ( hide video did not start )
	 */
	var _playAllVideos = function () {
		if (!Rexbuilder_Util.rexContainer || 'undefined' === typeof Rexbuilder_Util.rexContainer) return;
		var mp4Videos = [].slice.call(Rexbuilder_Util.rexContainer.getElementsByClassName('mp4-player'));
		var vimeoVideos = [].slice.call(Rexbuilder_Util.rexContainer.getElementsByClassName('vimeo-player'));
		var ytbVideos = [].slice.call(Rexbuilder_Util.rexContainer.getElementsByClassName('youtube-player'));
		var i,
			tot_mp4Videos = mp4Videos.length,
			tot_vimeoVideos = vimeoVideos.length,
			tot_ytbVideos = ytbVideos.length;

		if (Rexbuilder_Util.editorMode) {
			for (i = 0; i < tot_mp4Videos; i++) {
				Rexbuilder_Util.playVideo($(mp4Videos[i]));
			}
		}

		for (i = 0; i < tot_vimeoVideos; i++) {
			Rexbuilder_Util.playVideo($(vimeoVideos[i]));
		}

		for (i = 0; i < tot_ytbVideos; i++) {
			Rexbuilder_Util.playVideo($(ytbVideos[i]));
		}
	};

	var _playVideo = function ($target) {
		var target = $target[0];

		if ('undefined' === typeof target) {
			return;
		}

		if (Rexbuilder_Util.hasClass(target, 'mp4-player')) {
			var videoEl = target.querySelector('video');
			if (videoEl) {
				videoEl.play();
			}
		} else if (Rexbuilder_Util.hasClass(target, 'vimeo-player')) {
			var vimeoPlugin = VimeoVideo.findVideo(target.querySelector('iframe'));
			if (vimeoPlugin) {
				vimeoPlugin.play();
			}
		} else if (Rexbuilder_Util.hasClass(target, 'youtube-player')) {
			var youtubeEl = target.querySelector('.rex-youtube-wrap');
			if (youtubeEl) {
				var $youtubeEl = $(youtubeEl);
				if ($youtubeEl.YTPGetPlayer() === undefined) {
					return;
				}
				$youtubeEl.YTPPlay();
			} else {
				return;
			}
		}
	};

	var _getPaddingsDataString = function (paddingString) {
		var paddingsData = {
			top: '5',
			right: '5',
			bottom: '5',
			left: '5',
			type: 'px'
		};
		if (paddingString != '') {
			var paddings = paddingString.split(/;/gm);
			paddingsData.top = parseInt(paddings[0].split(/\D+/gm)[0]);
			paddingsData.right = parseInt(paddings[1].split(/\D+/gm)[0]);
			paddingsData.bottom = parseInt(paddings[2].split(/\D+/gm)[0]);
			paddingsData.left = parseInt(paddings[3].split(/\D+/gm)[0]);

			var typePaddingActive = '';
			if (paddings[0].indexOf('%') != -1) {
				typePaddingActive = '%';
			} else {
				typePaddingActive = 'px';
			}
			paddingsData.type = typePaddingActive;
		}
		return paddingsData;
	};

	var _paddingsToString = function (paddings) {
		var output = '';
		output += '' + paddings.top + paddings.type + ';';
		output += '' + paddings.right + paddings.type + ';';
		output += '' + paddings.bottom + paddings.type + ';';
		output += '' + paddings.left + paddings.type + ';';
		return output;
	};

	var getCoord = function (val, maxWidth) {
		maxWidth = 'undefined' !== typeof maxWidth ? maxWidth : 12;
		return {
			x: val % maxWidth,
			y: Math.floor(val / maxWidth)
		};
	};

	/**
	 * Compare N strings to find the unique words inside
	 * @param {Array} s_arr array of strings to diff
	 * @param {String} separator string that separates the words inside the strings
	 * @return {Array} array of strings that occurence one time
	 * @since 2.0.0
	 * @date 09-05-2019
	 */
	var _diffStrings = function (s_arr, separator) {
		separator = 'undefined' !== typeof separator ? separator : ' ';
		// join the strings
		var c = s_arr.join(' ');

		// create an array of strings to check
		var c_pool = c.split(separator);

		var res_obj = {};
		var res_pool = [];
		// var result = '';

		// count the string occurencies
		for (var i = 0, c_tot = c_pool.length; i < c_tot; i++) {
			res_obj[c_pool[i]] = 'undefined' !== typeof res_obj[c_pool[i]] ? res_obj[c_pool[i]] + 1 : 1;
		}

		// if there is only one occurency, save it
		for (var occurency in res_obj) {
			if (1 === res_obj[occurency]) {
				res_pool.push(occurency);
			}
		}

		// return the string of words that occurenc only one time
		// result = res_pool.join(' ');
		// return the array of words that occurenc only one time
		return res_pool;
	};

	/**
	 * Handling front end change layout
	 * @param  {String}		chosenLayoutName	name of the layout
	 * @return {void}
	 * @since  2.0.4
	 */
	function handleLayoutChange(chosenLayoutName) {
		var sections = Array.prototype.slice.call(
			Rexbuilder_Util.rexContainer.querySelectorAll('.rexpansive_section:not(.removing_section)')
		);
		var tot_sections = sections.length;

		// No change between saved layout, simple resize
		// if ( chosenLayoutName == Rexbuilder_Util.activeLayout && chosenLayoutName == "default" ) {
		//   return;
		// }

		Rexbuilder_Util.rexContainer.setAttribute('data-rex-layout-selected', chosenLayoutName);
		Rexbuilder_Util.activeLayout = chosenLayoutName;

		var modelsIDInPage = [];
		var sectionsPage = [];

		var sIndex;

		var temp_secObj;
		for (sIndex = 0; sIndex < tot_sections; sIndex++) {
			// populate models ids array
			if (Rexbuilder_Util.hasClass(sections[sIndex], 'rex-model-section')) {
				modelsIDInPage.push(parseInt(sections[sIndex].getAttribute('data-rexlive-model-id')));
			}

			// populate sections object array
			temp_secObj = {
				rexID: sections[sIndex].getAttribute('data-rexlive-section-id'),
				modelID: isNaN(parseInt(sections[sIndex].getAttribute('data-rexlive-model-id')))
					? ''
					: parseInt(sections[sIndex].getAttribute('data-rexlive-model-id'))
			};
			sectionsPage.push(temp_secObj);
		}

		var i, j;

		var layoutDataPage = Rexbuilder_Util.getPageCustomizations();

		if (Rexbuilder_Util.activeLayout == 'default') {
			Rexbuilder_Util.saveCustomizationDomOrder(jQuery.extend(true, [], layoutDataPage));
		}

		var layoutDataModels = Rexbuilder_Util.getModelsCustomizations();
		var defaultLayoutSections;

		// first load default layout state generation
		if ($defaultLayoutState.attr('data-empty-default-customization') == 'true') {
			defaultLayoutSections = Rexbuilder_Util.getDefaultPageLayout(layoutDataPage, layoutDataModels);
			_createDefaultLayoutState(defaultLayoutSections);
		} else {
			// on change layout, the default state may be change, get it updated
			Rexbuilder_Util.updateDefaultLayoutState({
				modelsData: layoutDataModels
			});
			defaultLayoutSections = Rexbuilder_Util.getDefaultLayoutState();
		}

		var layoutSelectedSections = Rexbuilder_Util.getCustomLayoutSections(
			layoutDataPage,
			layoutDataModels,
			defaultLayoutSections,
			chosenLayoutName
		);

		//fixing models numbers
		var modelsNumbers = [];
		var flagModel;
		for (i = 0; i < layoutSelectedSections; i++) {
			if (layoutSelectedSections[i].section_is_model.toString() == 'true') {
				flagModel = false;
				for (j = 0; j < modelsNumbers.length; j++) {
					if (modelsNumbers[j].id == layoutSelectedSections[i].section_model_id) {
						modelsNumbers[j].number = modelsNumbers[j].number + 1;
						layoutSelectedSections[i].section_model_number = modelsNumbers[j].number;
						flagModel = true;
						break;
					}
				}
				if (!flagModel) {
					layoutSelectedSections[i].section_model_number = 1;
					modelsNumbers.push({
						id: layoutSelectedSections[i].section_model_id,
						number: 1
					});
				}
			}
		}

		Rexbuilder_Util.clearSectionsEdited();

		var mergedEdits = _mergeSections(layoutSelectedSections, defaultLayoutSections);

		// removing collapsed from grid
		// Rexbuilder_Util.removeCollapsedGrids();

		Rexbuilder_Util.domUpdating = true; // handleLayoutChange FRONTEND
		var forceCollapseElementsGrid = false;
		var sectionDomOrder = [];

		var meIndex, section;

		for (meIndex in mergedEdits) {
			if (!mergedEdits[meIndex].notInSection || chosenLayoutName == 'default') {
				var sectionObj = {
					rexID: mergedEdits[meIndex].section_rex_id,
					modelID: -1,
					modelNumber: -1
				};

				if (mergedEdits[meIndex].section_is_model.toString() == 'true') {
					sectionObj.modelID = mergedEdits[meIndex].section_model_id;
					sectionObj.modelNumber = mergedEdits[meIndex].section_model_number;
					section = Rexbuilder_Util.rexContainer.querySelector(
						'section[data-rexlive-section-id="' +
							mergedEdits[meIndex].section_rex_id +
							'"][data-rexlive-model-number="' +
							sectionObj.modelNumber +
							'"]'
					);
				} else {
					section = Rexbuilder_Util.rexContainer.querySelector(
						'section[data-rexlive-section-id="' + mergedEdits[meIndex].section_rex_id + '"]'
					);
				}

				if (section && !Rexbuilder_Util.hasClass(section, 'removing_section')) {
					if (
						'undefined' !== typeof mergedEdits[meIndex].section_hide &&
						'true' == mergedEdits[meIndex].section_hide.toString()
					) {
						Rexbuilder_Util.addClass(section, 'rex-hide-section');
					} else {
						Rexbuilder_Util.removeClass(section, 'rex-hide-section');
						updateRexGrid(section, mergedEdits[meIndex].targets, forceCollapseElementsGrid, meIndex);
					}
					sectionDomOrder.push(sectionObj);
				}
			}
		}

		Rexbuilder_Dom_Util.fixSectionDomOrder(sectionDomOrder, true);

		Rexbuilder_Util.domUpdating = false; // handleLayoutChange FRONTEND
	}

	/**
	 * Update grid infos based on the layout information
	 * @param		{Element}		section											section element
	 * @param		{JSON}			information									section information
	 * @param		{Boolean}		forceCollapseElementsGrid
	 * @return	{void}
	 * @since		2.0.4
	 */
	function updateRexGrid(section, targets, forceCollapseElementsGrid) {
		var $section = $(section);
		var $gallery = $section.find('.grid-stack-row');

		var collapseGrid = targets[0].props.collapse_grid;

		// right spot?

		if (-1 !== targets[0].props.custom_classes.indexOf('rex-block-grid')) {
			collapseGrid = false;
		} /**else {
      collapseGrid = true;
    }**/

		// Setting one column mode on the actual RexGrid instance
		section.querySelector('.section-data').setAttribute('data-collapse-grid', collapseGrid);

		if (targets[0].props.gridEdited) {
			$gallery.attr('data-rexlive-layout-changed', true);
		}

		var i,
			tot_targets = targets.length;

		for (i = 1; i < tot_targets; i++) {
			var $elem = $gallery.children('div[data-rexbuilder-block-id="' + targets[i].name + '"]');
			var hideElement =
				typeof targets[i].props.hide == 'undefined' ? false : targets[i].props.hide.toString() == 'true';
			if (hideElement) {
				if (!$elem.hasClass('rex-hide-element')) {
					$elem.addClass('rex-hide-element');
				}
			} else {
				if ($elem.hasClass('rex-hide-element')) {
					$elem.removeClass('rex-hide-element');
				}
			}
		}

		var targetName, targetProps;
		var $elem, $itemData, $itemContent;
		var elem;
		var inlineImgs, tot_inlineImgs;
		for (i = 1; i < tot_targets; i++) {
			if (!targets[i].notDisplay || Rexbuilder_Util.activeLayout == 'default') {
				targetName = targets[i].name;
				targetProps = targets[i].props;

				$elem = $gallery.find('.perfect-grid-item[data-rexbuilder-block-id="' + targetName + '"]');
				elem = $elem[0];
				$itemData = $elem.children('.rexbuilder-block-data');
				$itemContent = $elem.find('.grid-item-content');

				if ($elem.length > 0) {
					inlineImgs = [].slice.call(elem.getElementsByTagName('img'));
					tot_inlineImgs = inlineImgs.length;

					if (!Rexbuilder_Util.editorMode && 0 !== tot_inlineImgs) {
						var j;

						for (j = 0; j < tot_inlineImgs; j++) {
							if ('true' === inlineImgs[j].getAttribute('inline-photoswipe')) {
								Rexbuilder_Photoswipe.addElementFromInline($(inlineImgs[j]));
							}
						}
					}

					var options = {
						$elem: $elem,
						targetProps: targetProps,
						$itemData: $itemData,
						$itemContent: $itemContent,
						gridstackInstance: null,
						positionAndSize: true,
						collapseGrid: collapseGrid
					};

					Rexbuilder_Util.updateDOMSingleElement(options);
				}
			}
		}

		updateSection($section, $gallery, targets[0].props, forceCollapseElementsGrid);

		/** @todo Need to check forceCollapseElementsGrid too? */
		/* if ( collapseGrid ) {
			// Collapsing only if there's a mobile layout saved in DB
			// because if not, data are already ok (they're changed
			// in function _mergeSections)
		} */
	}

	/**
	 * Removes duplicate values from an Array.
	 * Valid only with values that are comparable with ===.
	 * @param		{Array}		array 	Array to work with
	 * @returns	{Array}		The passed Array with unique values
	 * @since		2.0.4
	 */
	function removeArrayDuplicates(array) {
		return array.filter(function (value, index, self) {
			return self.indexOf(value) === index;
		});
	}

	/**
	 * Determines if a given element matches the given selector,
	 * or if it's a child of the element that matches the given selector.
	 * @param		{Element}		element
	 * @param		{String}		selector
	 * @returns	{Boolean}		Does the given element match, or is a child
	 * 											of the element that matches the given selector?
	 * @since		2.0.5
	 */
	function isOrIsChild(element, selector) {
		if (element.matches(selector)) {
			return true;
		}

		return 0 !== $(element).parents(selector).length;
	}

	/**
	 * Displays errros in the console and optionally in an alert. Used to standardize error displaying.
	 *
	 * @param	{string}	consoleMessage	Will be displayed in the console, together with error info, as an error
	 * @param	{string}	[alertMessage]	Will be displayed in an alert
	 * @since	2.0.6
	 */
	function displayError(consoleMessage, alertMessage) {
		/* === Console === */
		if ('string' !== typeof consoleMessage) {
			consoleMessage = consoleMessage.toString();
		}

		if (!/^\[Rexpansive\]/.test(consoleMessage)) {
			consoleMessage = '[Rexpansive] ' + consoleMessage;
		}

		console.error(consoleMessage);

		/* === Alert === */
		if (alertMessage && 'string' === typeof alertMessage) {
			alert(alertMessage);
		}
	}

	/**
	 * Displays errros of a jQuery AJAX request in the console and optionally in an alert.
	 * Used to standardize AJAX error displaying
	 * @param	{Object}	errorsObj				Object containing the arguments of an error of a jQuery AJAX request
	 * 																	(response, textStatus, errorThrown)
	 * @param	{String}	consoleMessage	Will be displayed in the console, together with error info, as an error
	 * @param	{String}	alertMessage		[OPTIONAL] Will be displayed in an alert
	 * @since	2.0.6
	 */
	function displayAjaxError(errorsObj, consoleMessage, alertMessage) {
		/* === Console === */
		if ('string' !== typeof consoleMessage) {
			consoleMessage = consoleMessage.toString();
		}

		if (!/^\[Rexpansive\]/.test(consoleMessage)) {
			consoleMessage = '[Rexpansive] ' + consoleMessage;
		}

		console.error(consoleMessage, {
			status: errorsObj.response.status,
			message: errorsObj.textStatus,
			errorThrown: errorsObj.errorThrown
		});

		/* === Alert === */
		if (alertMessage && 'string' === typeof alertMessage) {
			alert(alertMessage);
		}
	}

	// init the utilities
	var init = function () {
		this.globalViewport = Rexbuilder_Util.viewport();

		this.firstStart = true;

		this.isIframe = window.location !== window.parent.location;

		_plugin_frontend_settings.scroll_animation_offset = 0;

		Rexbuilder_Util.changedFrontLayout = false;

		if (_plugin_frontend_settings.user.logged && _plugin_frontend_settings.user.editing) {
			this.editorMode = true;
		} else {
			this.editorMode = false;
		}

		this._transitionEvent = _whichTransitionEvent();
		this._animationEvent = _whichAnimationEvent();

		this.$window = $(window);
		this.$document = $(document);
		this.$body = $('body');
		$bodyHtml = $('body, html');

		this.galleryPluginActive = false;

		_detect_mobile();

		// layouts initing
		$rexbuilderLayoutData = $(document.getElementById('rexbuilder-layout-data'));
		$rexbuilderModelData = $(document.getElementById('rexbuilder-model-data'));
		$availableLayoutNames = $(document.getElementById('available-layouts-names'));

		var $availableDims = $(document.getElementById('layout-avaiable-dimensions'));
		frontAvailableLayouts = $availableDims.length > 0 ? JSON.parse($availableDims.text()) : [];
		var layoutsInPage = $availableLayoutNames.text();
		layoutSavedInfo = frontAvailableLayouts.filter(function (layout) {
			return -1 !== layoutsInPage.indexOf(layout.id);
		});

		if (!this.editorMode) {
			Rexbuilder_Util.startFrontLayout = _findFrontLayout();
		}

		$modelsCustomizationsDataDiv = $('#rexbuilder-model-data').children('.models-customizations').eq(0);
		$pageCustomizationsDataDiv = $rexbuilderLayoutData.children('.layouts-customizations').eq(0);
		$liveDataContainer = $('#rexbuilder-layout-data-live');
		$layoutsDomOrder = $('#rexbuilder-layouts-sections-order');
		$defaultLayoutState = $('#rexbuilder-default-layout-state');

		$usedIDSContainer = $('#sections-ids-used');
		_storeNamesUsed();

		$usedBlocksIDsContainer = $('#blocks-ids-used');
		_storeBlocksIDsUsed();

		this.$rexContainer = $('.rex-container');
		this.rexContainer = this.$rexContainer[0];

		if (this.$rexContainer.length === 0) {
			console.warn('[Rexpansive] No rexContainer detected! This may cause problems.');
		}

		this.backendEdited = false;
		if (
			Rexbuilder_Util.$rexContainer.length > 0 &&
			Rexbuilder_Util.$rexContainer.attr('data-backend-edited').toString() == 'true'
		) {
			Rexbuilder_Util.$rexContainer.addClass('backend-edited');
			this.backendEdited = true;
		}
		this.lastSectionNumber = -1;

		this.activeLayout = '';
		this.domUpdating = false; // init

		// to fix, now considers only the first row, not the entire
		var oldResposiveBlockGrid = this.$rexContainer.children('.rexpansive_section').eq(0).attr('data-rex-collapse-grid');
		this.blockGridUnder768 =
			typeof oldResposiveBlockGrid != 'undefined' ? oldResposiveBlockGrid.toString() == 'false' : false;

		this.chosenLayoutData = null;

		this.loadWidth = Rexbuilder_Util.globalViewport.width;

		_updateSectionsIDs();
		_updateBlocksIDs();
		Rexbuilder_Dom_Util.fixModelNumbers();
		_updateSectionsNumber();

		this.firstStart = false;
	};

	return {
		init: init,
		viewport: _viewport,
		getYoutubeID: getYoutubeID,
		transitionEvent: _transitionEvent,
		animationEvent: _animationEvent,
		checkPresentationPage: _checkPresentationPage,
		checkStaticPresentationPage: _checkStaticPresentationPage,
		// checkPost: _checkPost,
		editorMode: editorMode,
		windowIsResizing: windowIsResizing,
		launchVideoPlugins: _launchVideoPlugins,
		stopPluginsSection: _stopPluginsSection,
		playPluginsSection: _playPluginsSection,
		stopBlockVideos: _stopBlockVideos,
		playBlockVideos: _playBlockVideos,
		chooseLayout: chooseLayout,
		predictLayout: predictLayout,
		setContainer: setContainer,
		createRandomID: createRandomID,
		createRandomNumericID: _createRandomNumericID,
		responsiveLayouts: responsiveLayouts,
		defaultLayoutSections: defaultLayoutSections,
		launchEditDomLayout: launchEditDomLayout,
		edit_dom_layout: edit_dom_layout,
		smoothScroll: _smoothScroll,
		getGalleryInstance: getGalleryInstance,
		removeCollapsedGrids: removeCollapsedGrids,
		collapseAllGrids: collapseAllGrids,
		stopVideo: _stopVideo,
		playVideoFromBegin: _playVideoFromBegin,
		pauseVideo: _pauseVideo,
		playVideo: _playVideo,
		destroyVideo: _destroyVideo,
		startVideoPlugin: startVideoPlugin,
		getPaddingsDataString: _getPaddingsDataString,
		paddingsToString: _paddingsToString,
		playAllVideos: _playAllVideos,
		findLayoutType: _findLayoutType,
		updateModelsLive: _updateModelsLive,
		getLayoutSectionTargets: _getLayoutSectionTargets,
		updateElementDimensions: updateElementDimensions,
		getGridLayout: _getGridLayout,
		customizationExists: _customizationExists,
		getDefaultBlockProps: _getDefaultBlockProps,
		fixVideosAudioSection: _fixVideosAudioSection,
		fixVideoAudio: _fixVideoAudio,
		fixYoutube: _fixYoutube,
		saveCustomizationDomOrder: _saveCustomizationDomOrder,
		getDefaultPageLayout: _getDefaultPageLayout,
		getModelsCustomizations: _getModelsCustomizations,
		updateModelsCustomizationsData: _updateModelsCustomizationsData,
		getPageCustomizations: _getPageCustomizations,
		updatePageCustomizationsData: _updatePageCustomizationsData,
		updatePageAvaiableLayoutsNames: _updatePageAvaiableLayoutsNames,
		getPageAvaiableLayoutsNames: _getPageAvaiableLayoutsNames,
		updateDivModelCustomizationsNames: _updateDivModelCustomizationsNames,
		getSectionCustomLayouts: _getSectionCustomLayouts,
		getLayoutLiveSectionTargets: _getLayoutLiveSectionTargets,
		getGridLayoutLive: _getGridLayoutLive,
		getCustomLayoutSections: _getCustomLayoutSections,
		updateSectionStateLive: _updateSectionStateLive,
		updatePageCustomizationsDomOrder: _updatePageCustomizationsDomOrder,
		getPageDefaultDom: _getPageDefaultDom, 
		getPageCustomizationsDom: _getPageCustomizationsDom,
		updateDefaultLayoutState: _updateDefaultLayoutState,
		updateDefaultLayoutStateSection: _updateDefaultLayoutStateSection,
		updateDefaultLayoutStateDOMOrder: _updateDefaultLayoutStateDOMOrder,
		getDefaultLayoutState: _getDefaultLayoutState,
		updateSectionOrderCustomLayouts: _updateSectionOrderCustomLayouts,
		updateGridsHeights: _updateGridsHeights,
		updateDOMSingleElement: updateDOMSingleElement,
		getDefaultBlockMeasure: _getDefaultBlockMeasure,
		doneResizing: doneResizing,
		getCoord: getCoord,
		diffStrings: _diffStrings,
		applyDefaultBlocksDimentions: _applyDefaultBlocksDimentions,
		isMobile: _isMobile,
		cssPropertyValueSupported: _cssPropertyValueSupported,
		changedFrontLayout: changedFrontLayout,
		startFrontLayout: startFrontLayout,
		findFrontLayout: _findFrontLayout,
		parents: _parents,
		rtimeOut: rtimeOut,
		rInterval: rInterval,
		merge: _merge,
		handleLayoutChange: handleLayoutChange,
		removeArrayDuplicates: removeArrayDuplicates,
		isOrIsChild: isOrIsChild,

		// Class utilities
		hasClass: hasClass,
		addClass: addClass,
		removeClass: removeClass,
		toggleClass: toggleClass,

		// Sections IDs
		createSectionID: _createSectionID,
		addSectionID: _addSectionID,
		removeSectionID: _removeSectionID,
		saveSectionNamesUsed: _saveSectionNamesUsed,
		getSectionNamesUsed: _getSectionNamesUsed,

		// Blocks IDs
		createBlockID: createBlockID,
		addBlockID: addBlockID,
		removeBlockID: removeBlockID,
		saveBlocksIDsUsed: saveBlocksIDsUsed,
		updateBlocksIDsUsed: updateBlocksIDsUsed,
		getBlocksIDsUsed: getBlocksIDsUsed,

		// Grids lazy loading
		clearSectionsEdited: clearSectionsEdited,

		// Error displaying
		displayError: displayError,
		displayAjaxError: displayAjaxError
	};
})(jQuery);

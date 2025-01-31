/**
 * Object that contains the image media uploader
 * Admin side
 * @since 2.0.0
 */
var Rexlive_MediaUploader = (function($) {
  "use strict";

  var image_multiple_uploader_frame;
  var image_uploader_frame;
  var image_uploader_frame_direct;
  var image_uploader_me_frame;
  var video_multiple_uploader_frame;
  var video_uploader_frame;
  var accordion_uploader_frame;

  function _openInsertImageBlocksMediaUploader(info) {
    setUserSetting('imgsize', 'full');
    // If the frame is already opened, return it
    if (image_multiple_uploader_frame) {
      image_multiple_uploader_frame
        .state("insert-image")
        .set("liveTarget", info.sectionTarget);
      image_multiple_uploader_frame
        .state("insert-image")
        .set("eventName", info.returnEventName);
      image_multiple_uploader_frame.open();
      return;
    }

    //create a new Library, base on defaults
    //you can put your attributes in
    var insertImage = wp.media.controller.Library.extend({
      defaults: _.defaults(
        {
          id: "insert-image",
          title: "Insert Image",
          allowLocalEdits: true,
          displaySettings: true,
          displayUserSettings: true,
          multiple: true,
          library: wp.media.query({ type: "image" }),
          liveTarget: info.sectionTarget,
          eventName: info.returnEventName,
          type: "image" //audio, video, application/pdf, ... etc
        },
        wp.media.controller.Library.prototype.defaults
      )
    });

    //Setup media frame
    image_multiple_uploader_frame = wp.media({
      button: { text: "Select" },
      state: "insert-image",
      states: [new insertImage()]
    });

    //reset selection in popup, when open the popup
    image_multiple_uploader_frame.on("open", function() {
      var selection = image_multiple_uploader_frame
        .state("insert-image")
        .get("selection");

      //remove all the selection first
      selection.each(function(image) {
        if ("undefined" !== typeof image) {
          var attachment = wp.media.attachment(image.attributes.id);
          attachment.fetch();
          selection.remove(attachment ? [attachment] : []);
        }
      });
    });

    image_multiple_uploader_frame.on("close", function() {
      setUserSetting('imgsize', 'full');
    });

    image_multiple_uploader_frame.on("select", function() {
      var state = image_multiple_uploader_frame.state("insert-image");
      var sectionTarget = state.get("liveTarget");
      var eventName = state.get("eventName");

      var selection = state.get("selection");
      var data = {
        eventName: eventName,
        data_to_send: {
          info: info,
          media: [],
          sectionTarget: sectionTarget
        }
      };

      if (!selection) return;

      //to get right side attachment UI info, such as: size and alignments
      //org code from /wp-includes/js/media-editor.js, arround `line 603 -- send: { ... attachment: function( props, attachment ) { ... `
      selection.each(function(attachment) {
        var display = state.display(attachment).toJSON();
        var obj_attachment = attachment.toJSON();

        // If captions are disabled, clear the caption.
        if (!wp.media.view.settings.captions) delete obj_attachment.caption;

        display = wp.media.string.props(display, obj_attachment);

        var to_send = {
          media_info: obj_attachment,
          display_info: display
        };

        data.data_to_send.media.push(to_send);
      });

      // Launch image insert event to the iframe
      Rexbuilder_Util_Admin_Editor.sendIframeBuilderMessage(data);
    });

    //now open the popup
    image_multiple_uploader_frame.open();
  } // openMediaUploader IMAGE END

  /**
   * Live insert/edit a single image Uploader
   * Use this on all the buttons that need to open the uploader
   * directly on click
   * 
   * @since 2.0.0
   * @param {Object}  info
   */
  function _openImageLiveMediaUploader(info) {
    setUserSetting('imgsize', 'undefined' !== typeof info.imageSize && '' !== info.imageSize ? info.imageSize : 'full' );
    
    // If the frame is already opened, return it
    if (image_uploader_frame_direct) {
      image_uploader_frame_direct
        .state("live-image")
        .set("liveTarget", info.sectionTarget)
        .set("selected_image", info.idImage)
        .set("eventName", info.returnEventName)
        .set("data_to_send", info.data_to_send)
      image_uploader_frame_direct.open();
      return;
    }

    //create a new Library, base on defaults
    //you can put your attributes in
    var insertImage = wp.media.controller.Library.extend({
      defaults: _.defaults(
        {
          id: "live-image",
          title: "Edit Image",
          allowLocalEdits: true,
          displaySettings: true,
          displayUserSettings: true,
          multiple: false,
          library: wp.media.query({ type: "image" }),
          liveTarget: info.sectionTarget,
          eventName: info.returnEventName,
          data_to_send: info.data_to_send,
          selected_image: info.idImage,
          type: "image" //audio, video, application/pdf, ... etc
        },
        wp.media.controller.Library.prototype.defaults
      )
    }); 

    //Setup media frame
    image_uploader_frame_direct = wp.media({
      button: { text: "Select" },
      state: "live-image",
      states: [new insertImage()]
    });

    // prevent attachment size strange selections
    // image_uploader_frame_direct.on('selection:toggle', function(e) {
    //   var attachmentSizeEl = document.querySelector( 'select[name="size"]' );
    //   if ( attachmentSizeEl ) {
    //     attachmentSizeEl.value = 'full';
    //   }
    // });

    //reset selection in popup, when open the popup
    image_uploader_frame_direct.on("open", function() {
      var attachment;
      var selection = image_uploader_frame_direct
        .state("live-image")
        .get("selection");

      //remove all the selection first
      selection.each(function(video) {
        attachment = wp.media.attachment(video.attributes.id);
        attachment.fetch();
        selection.remove(attachment ? [attachment] : []);
      });

      var image_id = image_uploader_frame_direct
        .state("live-image")
        .get("selected_image");

      var image_info = image_uploader_frame_direct
        .state("live-image")
        .get("data_to_send");

      // Check the already inserted image
      if (image_id) {
        attachment = wp.media.attachment(image_id);
        attachment.fetch();

        selection.add(attachment ? [attachment] : []);
      }
    });

    image_uploader_frame_direct.on("select", function() {
      var state = image_uploader_frame_direct.state("live-image");
      var sectionTarget = state.get("liveTarget");
      var eventName = state.get("eventName");
			var data_to_send = state.get("data_to_send");
      var selection = state.get("selection");
			
      var data = {
        eventName: eventName,
        data_to_send: {
          // info: info,
          // media: [],
          sectionTarget: sectionTarget,
          target: sectionTarget
        }
        // data_to_send: data_to_send
      };

      if (!selection) return;

      //to get right side attachment UI info, such as: size and alignments
      //org code from /wp-includes/js/media-editor.js, arround `line 603 -- send: { ... attachment: function( props, attachment ) { ... `
      selection.each(function(attachment) {
        var display = state.display(attachment).toJSON();
        var obj_attachment = attachment.toJSON();

        // If captions are disabled, clear the caption.
        if (!wp.media.view.settings.captions) delete obj_attachment.caption;

        display = wp.media.string.props(display, obj_attachment);

        // var to_send = {
        //   media_info: obj_attachment,
        //   display_info: display
        // };

        // data.data_to_send.media.push(to_send);
        data.data_to_send.idImage = obj_attachment.id;
        data.data_to_send.urlImage = display.src;
        data.data_to_send.image_size = display.size;
        data.data_to_send.width = display.width;
        data.data_to_send.height = display.height;

        if( 'undefined' !== typeof data_to_send.photoswipe ) {
          data.data_to_send.photoswipe = data_to_send.photoswipe;
        }

        if( 'undefined' !== typeof data_to_send.active ) {
          data.data_to_send.active = data_to_send.active;
        }

        if( 'undefined' !== typeof data_to_send.typeBGimage ) {
          data.data_to_send.typeBGimage = data_to_send.typeBGimage;
        }
      });

      // Synch top toolbar tools
      Rexbuilder_Util_Admin_Editor.highlightRowSetData({
        image_bg_section_active: data.data_to_send.active,
        image_bg_section: data.data_to_send.urlImage,
        id_image_bg_section: data.data_to_send.idImage
      });
      Rexbuilder_Util_Admin_Editor.updateBkgrImgTool();

			data.data_to_send.tools = data_to_send.tools;
			
      data.data_to_send.updateBlockHeight = data_to_send.updateBlockHeight;

      // Launch image insert event to the iframe
      Rexbuilder_Util_Admin_Editor.sendIframeBuilderMessage(data);
    });

    image_uploader_frame_direct.on("close", function() {
      setUserSetting('imgsize', 'full');
    });

    //now open the popup
    image_uploader_frame_direct.open();
  } // openMediaUploader IMAGE END

  /**
   * Live insert/edit a single inline image inside a Medium Editor
   * 
   * @since 2.0.0
   * @param {Object}  img_data
   */
  function _openImageMEMediaUploader(img_data) {
      setUserSetting('imgsize', 'full');
    // If the frame is already opened, return it
    if (image_uploader_me_frame) {
      image_uploader_me_frame
        .state("me-image")
        .set("inlineImgData", img_data)
      image_uploader_me_frame.open();
      return;
    }

    //create a new Library, base on defaults
    //you can put your attributes in
    var insertImage = wp.media.controller.Library.extend({
      defaults: _.defaults(
        {
          id: "me-image",
          title: "Insert Image",
          allowLocalEdits: true,
          displaySettings: true,
          displayUserSettings: true,
          multiple: false,
          library: wp.media.query({ type: "image" }),
          type: "image", //audio, video, application/pdf, ... etc
          inlineImgData: img_data
        },
        wp.media.controller.Library.prototype.defaults
      )
    }); 

    //Setup media frame
    image_uploader_me_frame = wp.media({
      button: { text: "Select" },
      state: "me-image",
      states: [new insertImage()]
    });

    // prevent attachment size strange selections
    // image_uploader_me_frame.on('selection:toggle', function(e) {
    //   var attachmentSizeEl = document.querySelector( 'select[name="size"]' );
    //   if ( attachmentSizeEl ) {
    //     attachmentSizeEl.value = 'full';
    //   }
    // });

    image_uploader_me_frame.on("select", function() {
      var state = image_uploader_me_frame.state("me-image");
      var imageSettings = state.get("inlineImgData"); 

      var selection = state.get("selection");
      var imgData = {};
      var displayData = {};

      if (!selection) return;

      //to get right side attachment UI info, such as: size and alignments
      //org code from /wp-includes/js/media-editor.js, arround `line 603 -- send: { ... attachment: function( props, attachment ) { ... `
      selection.each(function(attachment) {
        var display = state.display(attachment).toJSON();
        var obj_attachment = attachment.toJSON();

        // If captions are disabled, clear the caption.
        if (!wp.media.view.settings.captions) delete obj_attachment.caption;

        display = wp.media.string.props(display, obj_attachment);

        displayData = display;

        imgData.idImage = obj_attachment.id;
        imgData.urlImage = display.src;
        if( "undefined" === typeof imageSettings.width ) {
          imgData.width = display.width;
        } else {
          imgData.width = ( "string" === typeof imageSettings ? imageSettings.width.replace("px","") : imageSettings.width );
        }

        if( "undefined" === typeof imageSettings.height ) {
          imgData.height = display.height;
        } else {
          imgData.height = ( "string" === typeof imageSettings ? imageSettings.height.replace("px","") : imageSettings.height );
        }

        if( "undefined" === typeof imageSettings.align ) {
          imgData.align = "alignnone";
        } else {
          imgData.align = imageSettings.align;
        }

        if ( 'undefined' !== typeof imageSettings.imgInsideLink && true === imageSettings.imgInsideLink ) {
          displayData.previousLink = true;
        } else {
          displayData.previousLink = false;
        }

      });

      var data = {
        eventName: "rexlive:inlineImageEdit",
        data_to_send: {
          imgData: imgData,
          displayData: displayData
        }
      };

      // Launch image insert event to the iframe
      Rexbuilder_Util_Admin_Editor.sendIframeBuilderMessage(data);
    });

    image_uploader_me_frame.on("close", function() {
      const data = {
        eventName: "rexlive:inlineImageClose"
      }
      Rexbuilder_Util_Admin_Editor.sendIframeBuilderMessage(data);
      setUserSetting('imgsize', 'full');
    });

    //reset selection in popup, when open the popup
    image_uploader_me_frame.on("open", function() {
      var attachment;
      var selection = image_uploader_me_frame
        .state("me-image")
        .get("selection");

      //remove all the selection first
      selection.each(function(video) {
        attachment = wp.media.attachment(video.attributes.id);
        attachment.fetch();
        selection.remove(attachment ? [attachment] : []);
      });

      var imageSettings = image_uploader_me_frame.state("me-image").get("inlineImgData");

      var image_id = null;
      if( "undefined" !== typeof imageSettings ) {
        image_id = ( "undefined" !== typeof imageSettings.image_id ? imageSettings.image_id : null );
      }

      // Check the already inserted image
      if (image_id) {
        attachment = wp.media.attachment(image_id);
        attachment.fetch();

        selection.add(attachment ? [attachment] : []);
      }
    });

    //now open the popup
    image_uploader_me_frame.open();
  } // openMediaUploader IMAGE END

  /**
   * Open the media uploader for a row background
   * Needs refactoring or making another function
   * @param {jQuery Object} $data Button launcher
   * @param {jQuery Object} $preview Preview Object
   * @param {int} image_id image id
   */
  function _openEditImageMediaUploader($data, $preview, image_id) {
    setUserSetting('imgsize', 'full');

    image_id = typeof image_id !== "undefined" ? image_id : null;

    if (image_uploader_frame) {
      // setting my custom data
      image_uploader_frame.state("upload-image-bg").set("$data", $data);
      image_uploader_frame.state("upload-image-bg").set("$preview", $preview);
      image_uploader_frame.state("upload-image-bg").set("image_id", image_id);

      image_uploader_frame.open();
      return;
    }

    //create a new Library, base on defaults
    //you can put your attributes in
    var uplaodImage = wp.media.controller.Library.extend({
      defaults: _.defaults(
        {
          id: "upload-image-bg",
          title: "Select Background Image",
          allowLocalEdits: true,
          displaySettings: true,
          displayUserSettings: true,
          multiple: false,
          library: wp.media.query({ type: "image" }),
          type: "image", //audio, video, application/pdf, ... etc
          $data: $data,
          $preview: $preview,
          image_id: image_id
        },
        wp.media.controller.Library.prototype.defaults
      )
    });

    //Setup media frame
    image_uploader_frame = wp.media({
      button: { text: "Select" },
      state: "upload-image-bg",
      states: [new uplaodImage()]
    });

    //on close, if there is no select files, remove all the files already selected in your main frame
    image_uploader_frame.on("close", function() {
      setUserSetting('imgsize', 'full');

      var selection = image_uploader_frame
        .state("upload-image-bg")
        .get("selection");
      if (selection.length == 0) {
        $data.val();
      }
    });

    image_uploader_frame.on("select", function() {
      var state = image_uploader_frame.state("upload-image-bg");
      var selection = state.get("selection");

      if (!selection) return;

      selection.each(function(attachment) {
        var display = state.display(attachment).toJSON();
        var obj_attachment = attachment.toJSON();

        // If captions are disabled, clear the caption.
        if (!wp.media.view.settings.captions) delete obj_attachment.caption;

        display = wp.media.string.props(display, obj_attachment);

        var $data = image_uploader_frame.state("upload-image-bg").get("$data");

        // save id image info
        $data.val(obj_attachment.id);
        $data.attr("data-rex-image-bg-url", display.src);
        $data.attr("data-rex-image-width", display.width);
        $data.attr("data-rex-image-height", display.height);

        // create image preview
        image_uploader_frame
          .state("upload-image-bg")
          .get("$preview")
          .css("backgroundImage", "url(" + obj_attachment.url + ")");
        image_uploader_frame
          .state("upload-image-bg")
          .get("$preview")
          .children()
          .css("display", "none");

        if ($data.parents("#rex-edit-background-section").length != 0) {
          Background_Section_Image_Modal.updateImageBackground();
        } else if ($data.parents("#block-edit-image-bg").length != 0) {
          Background_Block_Image_Modal.updateImageBackground();
        } else if ($data.parents("#block-edit-image-setting-bg").length != 0) {
          Background_Block_Image_Setting.updateImageBackground();
        }
      });
    });

    //reset selection in popup, when open the popup
    image_uploader_frame.on("open", function() {
      var attachment;
      var selection = image_uploader_frame
        .state("upload-image-bg")
        .get("selection");

      //remove all the selection first
      selection.each(function(video) {
        attachment = wp.media.attachment(video.attributes.id);
        attachment.fetch();
        selection.remove(attachment ? [attachment] : []);
      });

      var image_id = image_uploader_frame
        .state("upload-image-bg")
        .get("image_id");

      // Check the already inserted image
      if (image_id) {
        attachment = wp.media.attachment(image_id);
        attachment.fetch();

        selection.add(attachment ? [attachment] : []);
      }
    });

    //now open the popup
    image_uploader_frame.open();
  }

  function _openInsertVideoBlocksMediaUploader(info) {
    // If the frame is already opened, return it
    if (video_multiple_uploader_frame) {
      video_multiple_uploader_frame.open();
      return;
    }

    //create a new Library, base on defaults
    //you can put your attributes in
    var insertVideo = wp.media.controller.Library.extend({
      defaults: _.defaults(
        {
          id: "insert-video",
          title: "Insert Video",
          allowLocalEdits: true,
          displaySettings: true,
          displayUserSettings: true,
          multiple: true,
          library: wp.media.query({ type: "video" }),
          type: "video" //audio, video, application/pdf, ... etc
        },
        wp.media.controller.Library.prototype.defaults
      )
    });

    //Setup media frame
    video_multiple_uploader_frame = wp.media({
      button: { text: "Select" },
      state: "insert-video",
      states: [new insertVideo()]
    });

    //on close, if there is no select files, remove all the files already selected in your main frame
    video_multiple_uploader_frame.on("close", function() {});

    video_multiple_uploader_frame.on("select", function() {
      var state = video_multiple_uploader_frame.state("insert-video");
      var selection = state.get("selection");
      var videoArray = [];

      if (!selection) return;

      selection.each(function(attachment) {
        var videoObj = {
          videoID: -1,
          videoUrl: "",
          width: "",
          height: ""
        };

        var display = state.display(attachment).toJSON();
        var obj_attachment = attachment.toJSON();

        // If captions are disabled, clear the caption.
        if (!wp.media.view.settings.captions) delete obj_attachment.caption;

        display = wp.media.string.props(display, obj_attachment);
        videoObj.videoID = obj_attachment.id;
        videoObj.videoUrl = obj_attachment.url;
        videoObj.width = obj_attachment.width;
        videoObj.height = obj_attachment.height;
        videoArray.push(videoObj);
      });

      Insert_Video_Modal.updateMp4VideoModal(videoArray);
    });

    //reset selection in popup, when open the popup
    video_multiple_uploader_frame.on("open", function() {
      var selection = video_multiple_uploader_frame
        .state("insert-video")
        .get("selection");
      //remove all the selection first
      selection.each(function(video) {
        if ("undefined" !== typeof video) {
          var attachment = wp.media.attachment(video.attributes.id);
          attachment.fetch();
          selection.remove(attachment ? [attachment] : []);
        }
      });
    });

    //now open the popup
    video_multiple_uploader_frame.open();
  } // openMediaUploader VIDEO END

  function _openMediaUploaderVideo($data, video_id) {
    video_id = typeof video_id !== "undefined" ? video_id : null;

    if (video_uploader_frame) {
      // setting my custom data
      video_uploader_frame.state("upload-video-bg").set("$data", $data);
      video_uploader_frame.state("upload-video-bg").set("video_id", video_id);

      video_uploader_frame.open();
      return;
    }

    //create a new Library, base on defaults
    //you can put your attributes in
    var uploadVideo = wp.media.controller.Library.extend({
      defaults: _.defaults(
        {
          id: "upload-video-bg",
          title: "Select Background Image",
          allowLocalEdits: true,
          displaySettings: true,
          displayUserSettings: true,
          multiple: false,
          library: wp.media.query({ type: "video" }),
          type: "video", //audio, video, application/pdf, ... etc
          $data: $data,
          video_id: video_id
        },
        wp.media.controller.Library.prototype.defaults
      )
    });

    //Setup media frame
    video_uploader_frame = wp.media({
      button: { text: "Select" },
      state: "upload-video-bg",
      states: [new uploadVideo()]
    });

    //on close, if there is no select files, remove all the files already selected in your main frame
    video_uploader_frame.on("close", function() {
      var selection = video_uploader_frame
        .state("upload-video-bg")
        .get("selection");
      if (selection.length == 0) {
        $data.val();
      }
    });

    video_uploader_frame.on("select", function() {
      var state = video_uploader_frame.state("upload-video-bg");
      var selection = state.get("selection");

      if (!selection) return;

      selection.each(function(attachment) {
        var display = state.display(attachment).toJSON();
        var obj_attachment = attachment.toJSON();

        // If captions are disabled, clear the caption.
        if (!wp.media.view.settings.captions) delete obj_attachment.caption;

        display = wp.media.string.props(display, obj_attachment);

        var $data = video_uploader_frame.state("upload-video-bg").get("$data");
        // save video info
        $data.val(obj_attachment.id);
        $data.attr("data-rex-video-bg-url", obj_attachment.url);
        $data.attr("data-rex-video-bg-width", obj_attachment.width);
        $data.attr("data-rex-video-bg-height", obj_attachment.height);

        if ($data.parents("#video-section-editor-wrapper").length != 0) {
          Section_Video_Background_Modal.updateVideoBackground();
          Section_Video_Background_Modal.updateVideoMp4Link(obj_attachment.url);
        } else if ($data.parents("#video-block-editor-wrapper").length != 0) {
          Block_Video_Background_Modal.updateVideoBackground();
          Block_Video_Background_Modal.updateVideoMp4Link(obj_attachment.url);
        }
      });
    });

    //reset selection in popup, when open the popup
    video_uploader_frame.on("open", function() {
      var attachment;
      var selection = video_uploader_frame
        .state("upload-video-bg")
        .get("selection");

      //remove all the selection first
      selection.each(function(video) {
        attachment = wp.media.attachment(video.attributes.id);
        attachment.fetch();
        selection.remove(attachment ? [attachment] : []);
      });

      var video_id = video_uploader_frame
        .state("upload-video-bg")
        .get("video_id");

      // Check the already inserted image
      if (video_id) {
        attachment = wp.media.attachment(video_id);
        attachment.fetch();

        selection.add(attachment ? [attachment] : []);
      }
    });

    //now open the popup
    video_uploader_frame.open();
  }

  /**
   * Open media uploader to insert/edit an accordion gallery
   * @param {Object}  gallery_data  data of the accordion modal, and of the image list
   * @since 2.0.0
   */
  function _openMediaUploaderAccordionGallery( gallery_data ) {
    if (accordion_uploader_frame) {
      // setting my custom data
      
      accordion_uploader_frame.state("accordion-gallery").set("gallery_data", gallery_data);

      accordion_uploader_frame.open();
      return;
    }

    //create a new Library, base on defaults
    //you can put your attributes in
    var uploadAccordionGallery = wp.media.controller.Library.extend({
      defaults: _.defaults(
        {
          id: "accordion-gallery",
          title: "Accordion Gallery",
          allowLocalEdits: true,
          displaySettings: true,
          displayUserSettings: true,
          multiple: true,
          library: wp.media.query({ type: "image" }),
          type: "image", //audio, video, application/pdf, ... etc,
          gallery_data: gallery_data
        },
        wp.media.controller.Library.prototype.defaults
      )
    });

    //Setup media frame
    accordion_uploader_frame = wp.media({
      button: { text: "Select" },
      state: "accordion-gallery",
      states: [new uploadAccordionGallery()]
    });

    // prevent attachment size strange selections
    // accordion_uploader_frame.on('selection:toggle', function(e) {
    //   var attachmentSizeEl = document.querySelector( 'select[name="size"]' );
    //   if ( attachmentSizeEl ) {
    //     attachmentSizeEl.value = 'full';
    //   }
    // });

    //on close
    accordion_uploader_frame.on("close", function() {
      // var selection = accordion_uploader_frame
      //   .state("accordion-gallery")
      //   .get("selection");

      // if (selection.models.length > 0) {
        // for(var j=0; j < selection.models.length; j++ ) {
        //   if( "undefined" !== typeof selection.models[j] ) {
        //     var attachment = wp.media.attachment(selection.models[j].attributes.id);
        //     attachment.fetch();
        //     // selection.remove(attachment ? [attachment] : []);
        //   }
        // }
      // }
    });

    accordion_uploader_frame.on("select", function() {
      var state = accordion_uploader_frame.state("accordion-gallery");
      var selection = state.get("selection");

      if (!selection) return;

      var g_data = accordion_uploader_frame.state("accordion-gallery").get("gallery_data");
      g_data.modal_info.$accordion_preview_gallery.empty();

      selection.each(function(attachment) {
        var display = state.display(attachment).toJSON();
        var media_info = attachment.toJSON();

        // If captions are disabled, clear the caption.
        if (!wp.media.view.settings.captions) delete media_info.caption;

        var display_info = wp.media.string.props(display, media_info);

        g_data.modal_info.$accordion_preview_gallery.append( tmpl("tmpl-accordion-gallery-item", {
          id: media_info.id,
          preview: media_info.url,
          url: display_info.src,
          size: display_info.size
        }));
      });
    });

    //reset selection in popup, when open the popup
    accordion_uploader_frame.on("open", function() {
      var attachment;
      var selection = accordion_uploader_frame
        .state("accordion-gallery")
        .get("selection");

      //remove all the selection first
      selection.each(function(image) {
        if( "undefined" !== typeof image ) {
          attachment = wp.media.attachment(image.attributes.id);
          attachment.fetch();
          selection.remove(attachment ? [attachment] : []);
        }
      });

      var g_data = accordion_uploader_frame.state("accordion-gallery").get("gallery_data");

      // Check the already inserted image
      if (g_data.image_info.length > 0) {
        for( var i=0; i < g_data.image_info.length; i++ ) {
          attachment = wp.media.attachment(g_data.image_info[i].id);
          attachment.fetch();
  
          selection.add(attachment ? [attachment] : []);
        }
      }
    });

    //now open the popup
    accordion_uploader_frame.open();
  }

  return {
    openInsertImageBlocksMediaUploader: _openInsertImageBlocksMediaUploader,
    openEditImageMediaUploader: _openEditImageMediaUploader,
    openImageLiveMediaUploader: _openImageLiveMediaUploader,
    openImageMEMediaUploader: _openImageMEMediaUploader,
    openInsertVideoBlocksMediaUploader: _openInsertVideoBlocksMediaUploader,
    openMediaUploaderVideo: _openMediaUploaderVideo,
    openMediaUploaderAccordionGallery: _openMediaUploaderAccordionGallery
  };
})(jQuery);

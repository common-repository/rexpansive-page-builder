/*
 *  rexScrollify - v0.1
 *
 *  Made by NEWEB di Simone Forgiarini
 */
// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
; (function ($, window, document, undefined) {

  "use strict";

  // undefined is used here as the undefined global variable in ECMAScript 3 is
  // mutable (ie. it can be changed by someone else). undefined isn't really being
  // passed in so we can ensure the value of it is truly undefined. In ES5, undefined
  // can no longer be modified.

  // window and document are passed through as local variable rather than global
  // as this (slightly) quickens the resolution process and can be more efficiently
  // minified (especially when both are regularly referenced in your plugin).

  // Create the defaults once
  var pluginName = "rexScrollify",
    defaults = {
      // animation: "transition.slideUpBigIn",
      animation: 'rexSlideUpBigIn',
      duration: "500",
      offset: 0,
      delay: 0,
      stagger: 0,
      mobile: true,
      force_launch: false,
      context: null
    };

  // viewport size shared var
  // the window height do not depends on the elements to scroll position
  // its the same for everyone
  // so I can share it between the plugin instances and update it on the page resize
  var globalViewportSize = viewport();
  window.addEventListener('resize', updateGlobalViewportSize);

  var transitionEvent = whichTransitionEvent();
  var animationEvent = whichAnimationEvent();

  /**
   * Updating the viewport size only if occurs a window resize
   */
  function updateGlobalViewportSize() {
    globalViewportSize = viewport();
  }

  /**
   * Find the viewport scroll top value
   */
  function scrollDocumentPositionTop() {
    return window.pageYOffset || document.documentElement.scrollTop;
  }

  /**
   * Find the element offset top in the viewport
   * @param {Element} el element to analize
   * @param {Int} scrollTop window scroll top value
   */
  function offsetTop(el, scrollTop) {
    scrollTop = 'undefined' !== typeof scrollTop ? scrollTop : (window.pageYOffset || document.documentElement.scrollTop);
    var rect = el.getBoundingClientRect();
    return rect.top + scrollTop;
  }

  function viewport() {
    var e = window, a = 'inner';
    if (!('innerWidth' in window)) {
      a = 'client';
      e = document.documentElement || document.body;
    }
    return { width: e[a + 'Width'], height: e[a + 'Height'] };
  }

  // find the animation/transition event names
  function whichTransitionEvent() {
    var t,
      el = document.createElement("fakeelement");

    var transitions = {
      transition: "transitionend",
      OTransition: "oTransitionEnd",
      MozTransition: "transitionend",
      WebkitTransition: "webkitTransitionEnd"
    };

    for (t in transitions) {
      if (el.style[t] !== undefined) {
        return transitions[t];
      }
    }
  }

  function whichAnimationEvent() {
    var t,
      el = document.createElement("fakeelement");

    var animations = {
      animation: "animationend",
      OAnimation: "oAnimationEnd",
      MozAnimation: "animationend",
      WebkitAnimation: "webkitAnimationEnd"
    };

    for (t in animations) {
      if (el.style[t] !== undefined) {
        return animations[t];
      }
    }
  }

  function launchScrollingAnimation() {
    if ( globalViewportSize.width <= 767 && !this.settings.mobile ) {

      this.$element.css( 'opacity', 1 );
      this.properties.launched = true;
      this.removeScrollHandler();

    } else {
      if ( this.properties.launched ) {
        return;
      }

      var win_height = globalViewportSize.height,
        win_height_padded_bottom,
        win_height_padded_top,
        scrolled = scrollDocumentPositionTop(),
        blockPosition = offsetTop(this.element, scrolled),
        blockHeight = this.element.offsetHeight;

      if (this.settings.offset === 0) {
        win_height_padded_bottom = win_height * 0.7;
        win_height_padded_top = win_height * 0.2;
      } else if (this.settings.offset > 0) {
        win_height_padded_bottom = win_height - this.settings.offset;
        win_height_padded_top = win_height * 0.2;
      } else if (this.settings.offset < 0) {
        win_height_padded_bottom = win_height * 0.7;
        win_height_padded_top = win_height + this.settings.offset;
      }

      if (((blockPosition - win_height_padded_bottom < scrolled) && ((blockPosition + blockHeight) - win_height_padded_top > scrolled)) || this.settings.force_launch) {
        // Fix to prevent loop animation on delay
        if (this.settings.delay) {
          this.properties.launched = true;
        }

        this.launchAnimation();
      }
    }
  }

  // The actual plugin constructor
  function rexScrollify(element, options) {
    this.element = element;

    this.$element = $(element);

    // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin
    this.settings = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;

    this.properties = {
      launched: false
    };

    this.settings.animation = this.element.getAttribute('data-rs-animation') || this.settings.animation;
    this.settings.duration = this.element.getAttribute('data-rs-animation-duration') || this.settings.duration;
    this.settings.offset = parseInt(this.element.getAttribute('data-rs-animation-offset') || this.settings.offset);
    this.settings.delay = parseInt(this.element.getAttribute('data-rs-animation-delay') || this.settings.delay);
    this.settings.stagger = parseInt(this.element.getAttribute('data-rs-animation-stagger') || this.settings.stagger);
    this.settings.force_launch = this.element.getAttribute('data-rs-animation-force-launch') || this.settings.force_launch;

    this.bindedScrollHandler = null;

    this.init();
  }

  // Avoid Plugin.prototype conflicts
  $.extend(rexScrollify.prototype, {
    init: function () {

      // Place initialization logic here
      // You already have access to the DOM element and
      // the options via the instance, e.g. this.element
      // and this.settings
      // you can add more functions like the one below and
      // call them like the example bellow

      launchScrollingAnimation.call(this);

      // vanilla binding
      this.bindedScrollHandler = launchScrollingAnimation.bind(this);
      if( this.settings.context ) {
        this.settings.context.addEventListener('scroll',  this.bindedScrollHandler);
      } else {
        window.addEventListener('scroll',  this.bindedScrollHandler);
      }
    },
    
    launchAnimation: function() {
      var that = this;

      this.$element.one( animationEvent, function(e) {
        that.element.style.opacity = 1;
        that.$element.trigger('rs-animation-complete');
        that.removeScrollHandler();
      });

      this.properties.launched = true;
      this.$element.addClass( this.settings.animation );

      /*
      var that = this;
      this.$element.velocity(
        that.settings.animation,
        {
          duration: that.settings.duration,
          delay: that.settings.delay,
          stagger: that.settings.stagger,
          begin: function (elements) {
            that.properties.launched = true;
          },
          complete: function (elements) {
            that.$element.trigger('rs-animation-complete');
            that.removeScrollHandler();
          }
        }
      );
      */
    },

    removeScrollHandler: function() {
      if( this.settings.context ) {
        this.settings.context.removeEventListener( 'scroll', this.bindedScrollHandler );
      } else {
        window.removeEventListener( 'scroll', this.bindedScrollHandler );
      }
    }
  });

  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn[pluginName] = function (options) {
    var args = arguments;

    if (options === undefined || typeof options === 'object') {
      return this.each(function () {
        if (!$.data(this, 'plugin_' + pluginName)) {
          $.data(this, 'plugin_' + pluginName, new rexScrollify(this, options));
        }
      });
    } else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {

      var returns;

      this.each(function () {
        var instance = $.data(this, 'plugin_' + pluginName);
        if (instance instanceof rexScrollify && typeof instance[options] === 'function') {
          returns = instance[options].apply(instance, Array.prototype.slice.call(args, 1));
        }
        if (options === 'destroy') {
          $.data(this, 'plugin_' + pluginName, null);
        }
      });
      return returns !== undefined ? returns : this;
    }
  };

})(jQuery, window, document);

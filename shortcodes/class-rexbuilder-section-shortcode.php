<?php

/**
 * The class that register and render a section.
 *
 * @link       htto://www.neweb.info
 * @since      1.0.0
 *
 * @package    Rexbuilder
 * @subpackage Rexbuilder/admin
 */

/**
 * Defines the characteristics of the RexbuilderSection
 *
 * @package    Rexbuilder
 * @subpackage Rexbuilder/admin
 * @author     Neweb <info@neweb.info>
 *
 */
class Rexbuilder_Section {
	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    1.0.0
	 */
	public function __construct()
	{
		$this->plugin_name = 'rexpansive-builder';
	}

	/**
	 * Function that render the shortcode, merging the attributes and displaying the template.
	 *
	 * @since    1.0.0
	 * @param      string    $a                   The attributest passed.
	 * @param      string    $content            The content passed.
	 */
	public function render_section( $atts, $content = null ) {
		$parsed_atts = shortcode_atts( array(
			"section_name" => "",
			"section_nav_label" => "",
			"type" => "perfect-grid",
			"color_bg_section" => "#ffffff",
			"dimension" => "boxed",
			"margin" => "",
			"image_bg_section" => "",
			"id_image_bg_section" => "",
			"image_size" => "full",
			'video_bg_url_section' => '',
			'video_bg_id_section' => '',
			'video_bg_width_section' => '',
			'video_bg_height_section' => '',
			'video_bg_url_vimeo_section' => '',
			'full_height' => '',
			"block_distance" => 20,
			"layout" => "fixed",
			'responsive_background' => '',
			'custom_classes' => '',
			'grid_custom_classes' => '',
			'section_width' => '80%',
			'row_separator_top' => '',
			'row_separator_bottom' => '',
			'row_separator_right' => '',
			'row_separator_left' => '',
			'row_margin_top' => '',
			'row_margin_bottom' => '',
			'row_margin_right' => '',
			'row_margin_left' => '',
			'section_model' => '',
			'row_edited_live' => '',
			// 'section_model' => '',
			'rexlive_section_id' => '',
			'row_active_photoswipe' => '',
			'rexlive_model_id' => '',
			'rexlive_model_name' => ''
		), $atts, 'RexpansiveSection' );

		extract($parsed_atts);

		$options = get_option($this->plugin_name . '_options');
		$editor = Rexbuilder_Utilities::isBuilderLive();

		// Applying a filter to the content
		// Passing all the attributes as reference to edit them based on the content
		$content = apply_filters('rexpansive_filter_section', $content, array(&$parsed_atts));
		$grid_custom_classes = apply_filters('rexpansive_section_grid_custom_class', $grid_custom_classes, array(&$parsed_atts) );

		global $post;
		global $section_layout;
		$section_layout = $layout;

		$videoMp4Width = '';
		$videoMp4Height = '';

		$section_style = 'style="';
		$section_fast_load = '';
		if ("" != $id_image_bg_section) {
			$img_attrs = wp_get_attachment_image_src($id_image_bg_section, $image_size);
			if ( !$editor ) {
				$section_fast_load = ' data-res-lazy-loading="false" data-src="' . $img_attrs[0] . '"';
			} else {
				$section_style .= 'background-image:url(\'' . $img_attrs[0] . '\');';
			}
		} else if (!empty($color_bg_section)) {
			$section_style .= 'background-color:' . $color_bg_section . ';';
		}

		if ('' != $row_margin_top) {
			$section_style .= 'margin-top:' . $row_margin_top . 'px;';
		}

		if ('' != $row_margin_right) {
			$section_style .= 'margin-right:' . $row_margin_right . 'px;';
		}

		if ('' != $row_margin_bottom) {
			$section_style .= 'margin-bottom:' . $row_margin_bottom . 'px;';
		}

		if ('' != $row_margin_left) {
			$section_style .= 'margin-left:' . $row_margin_left . 'px;';
		}

		$section_responsive_style = '';
		if ("" != $responsive_background) {
			$section_responsive_style = ' style="background-color:' . $responsive_background . ';"';
		}

		$custom_classes = trim($custom_classes);

		if ( strpos( $custom_classes, "rex-block-grid" ) !== false ) {
			$custom_classes = str_replace("rex-block-grid", "", $custom_classes);
			$custom_classes = trim($custom_classes);
			$atts['custom_classes'] = $custom_classes;
			$rexlive_collapse_grid = false;
		}

		$row_separators = '';
		if ('' != $row_separator_top) {
			$row_separators .= ' data-row-separator-top="' . $row_separator_top . '"';
		} else {
			$row_separators .= ' data-row-separator-top="' . $block_distance . '"';
		}

		if ('' != $row_separator_right) {
			$row_separators .= ' data-row-separator-right="' . $row_separator_right . '"';
		} else {
			$row_separators .= ' data-row-separator-right="' . $block_distance . '"';
		}

		if ('' != $row_separator_bottom) {
			$row_separators .= ' data-row-separator-bottom="' . $row_separator_bottom . '"';
		} else {
			$row_separators .= ' data-row-separator-bottom="' . $block_distance . '"';
		}

		if ('' != $row_separator_left) {
			$row_separators .= ' data-row-separator-left="' . $row_separator_left . '"';
		} else {
			$row_separators .= ' data-row-separator-left="' . $block_distance . '"';
		}

		$video_has_audio = strpos( $custom_classes, "rex-video--with-audio" );
		$bg_video_toggle_audio_markup = "";

		if ( false !== $video_has_audio ) {
			$bg_video_toggle_audio_markup .= '<div class="rex-video-toggle-play-pause">';
			$bg_video_toggle_audio_markup .= '<div class="rex-video-toggle-play"></div>';
			$bg_video_toggle_audio_markup .= '<div class="rex-video-toggle-pause"></div>';
			$bg_video_toggle_audio_markup .= '</div>';
			$bg_video_toggle_audio_markup .= '<div class="rex-video-toggle-audio">';
			$bg_video_toggle_audio_markup .= '<div class="rex-video-toggle-audio-shadow"></div>';
			$bg_video_toggle_audio_markup .= '</div>';
		}

		$videoTypeActive = '';

		$bg_video_markup = '';
		if ('' != $video_bg_id_section && 'undefined' != $video_bg_id_section) {
			$videoTypeActive = 'mp4-player';
			$video_mp4_url = wp_get_attachment_url( $video_bg_id_section );
			$videoMP4Data = wp_get_attachment_metadata( $video_bg_id_section );
			$videoMp4Width = $videoMP4Data["width"];
			$videoMp4Height = $videoMP4Data["height"];

			$bg_video_markup .= '<div class="rex-video-wrap intrinsic-ignore" data-rex-video-width="'.$videoMp4Width.'" data-rex-video-height="'.$videoMp4Height.'">';
			$bg_video_markup .= '<video class="rex-video-container"' . ( ! $editor ? ' preload="none"' : ' preload autoplay' ) . ' loop muted playsinline width="' . $videoMp4Width  . '" height="' . $videoMp4Height . '">';
			if ( !$editor ) {
				$bg_video_markup .= '<source type="video/mp4" data-res-lazy-loading="false" data-src="' . $video_mp4_url . '" />';
				$bg_video_markup .= '</video>';
			} else {
				$bg_video_markup .= '<source type="video/mp4" src="' . $video_mp4_url . '" />';
				$bg_video_markup .= '</video>';
			}

			$bg_video_markup .= '</div>';
			if ( ! $editor ) {
				// adding video controllers
				$bg_video_markup .= '<div class="rex-video__controls"><div class="loader video-tool video-tool--view"></div><div class="pause video-tool"><div class="indicator"></div></div><div class="play video-tool"><div class="indicator"></div></div></div>';
			}
		}

		$bg_youtube_video_markup = '';

		if ('' != $video_bg_url_section && 'undefined' != $video_bg_url_section) {
			$videoTypeActive = 'youtube-player';
			$mute = ($bg_video_toggle_audio_markup != "" ? "false" : "true");
			$bg_youtube_video_markup .= '<div class="rex-youtube-wrap" data-property="{videoURL:\'' . $video_bg_url_section . '\',containment:\'self\',startAt:0,mute:' . $mute . ',autoPlay:true,loop:true,opacity:1,showControls:false,showYTLogo:false}"></div>';
		}

		$bg_video_vimeo_markup = '';
		if ('' != $video_bg_url_vimeo_section && 'undefined' != $video_bg_url_vimeo_section) {
			$videoTypeActive = 'vimeo-player';
			$bg_video_vimeo_markup .= '<div class="rex-video-vimeo-wrap rex-video-vimeo-wrap--section">';
			$bg_video_vimeo_markup .= '<iframe src="' . $video_bg_url_vimeo_section . '?autoplay=1&loop=1&title=0&byline=0&portrait=0&autopause=0&muted=1" width="640" height="360" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
			$bg_video_vimeo_markup .= '</div>';
		}
		
		if($content == ""){
			$empty_section = true;
		} else{
			$empty_section = false;
		}

		$content_has_photoswipe = strpos($content, 'photoswipe="true"');

		$content_has_floating_blocks = strpos($content, 'rex-floating-');

		$content_has_static_block = strpos($content, 'rex-static-block');

		$row_has_accordion = strpos($content, 'RexAccordion');

		$section_is_accordion = strpos( $custom_classes, 'rex-accordion' );

		$section_classes_arr = array();
		if ($empty_section) {
			array_push($section_classes_arr, 'empty-section');
		}
		if ($videoTypeActive!= "") {
			array_push($section_classes_arr, $videoTypeActive);
		}
		if ("" != $rexlive_model_id) {
			array_push($section_classes_arr, 'rex-model-section');
		}
		if ($content_has_photoswipe > 0) {
			array_push($section_classes_arr, 'photoswipe-gallery');
		}
		if ('' != $custom_classes) {
			array_push($section_classes_arr, $custom_classes);
		}
		if ('true' == $full_height) {
			array_push($section_classes_arr, 'full-height-section');
		}
		if ($content_has_floating_blocks !== false) {
			array_push($section_classes_arr, 'rex-section-has-floating-blocks');
		}
		if ($content_has_static_block !== false) {
			array_push($section_classes_arr, 'rex-section-has-static-blocks');
		}
		if (false !== $row_has_accordion) {
			array_push($section_classes_arr, 'rex-section-has-accordion');
		}
		if ($editor && $row_separator_top < 25) {
			array_push($section_classes_arr, 'ui-tools--near-top');
		}
		if (!$editor) {
			if ('' !== $id_image_bg_section) {
				array_push($section_classes_arr, 'section-w-image');
			}
			if ('' != $video_bg_id_section && 'undefined' != $video_bg_id_section) {
				array_push($section_classes_arr, 'section-w-html-video');
			}
		}
		// todo: add custom classes and use the array

		ob_start();

		echo '<section';

		if ($section_name != '' && $section_name != "undefined") {
			$section_id_parsed = preg_replace('/[\W\s+]/m', '', $section_name);
			echo ' data-rexlive-section-name="' . $section_name . '"';
			echo ' href="#' . $section_id_parsed . '" id="' . $section_id_parsed . '"';
		}

		// echo classes
		echo ' class="rexpansive_section' . ($empty_section ? ' empty-section' : '');
		echo ($videoTypeActive!= "" ? " ".$videoTypeActive : "");
		echo (("" != $rexlive_model_id) ? " rex-model-section" : "");
		echo (($content_has_photoswipe > 0) ? ' photoswipe-gallery' : '');
		echo (('' != $custom_classes) ? ' ' . $custom_classes : '');
		echo (('true' == $full_height) ? ' full-height-section' : '');
		echo (($content_has_floating_blocks !== false) ? ' rex-section-has-floating-blocks' : '');
		echo (($content_has_static_block !== false) ? ' rex-section-has-static-blocks' : '');
		echo ((false !== $row_has_accordion) ? ' rex-section-has-accordion' : '');
		echo ( $editor ? ( $row_separator_top < 25 ? ' ui-tools--near-top' : '' ) : '' );

		echo ( ! $editor && '' !== $id_image_bg_section ? ' section-w-image' : '' );
		echo ( ! $editor && '' != $video_bg_id_section && 'undefined' != $video_bg_id_section ? ' section-w-html-video' : '' );
		// custom classes filter
		echo apply_filters('rexpansive_builder_section_class', '', array( &$parsed_atts ) ) . '"';

		// photoswipe gallery check
		echo (($content_has_photoswipe > 0) ? ' itemscope itemtype="http://schema.org/ImageGallery"' : '');

		// section style
		echo (strlen($section_style) > 7 ? ' ' . $section_style . '"' : '');

		if ( '' !== $section_fast_load ) {
			echo ' ' . $section_fast_load;
		}

		if ("" != $id_image_bg_section) {
			echo ' data-background_image_width="' . $img_attrs[1] . '" ';
			echo ' data-background_image_height="' . $img_attrs[2] . '" ';
		}

		if ($rexlive_section_id != '') {
			echo ' data-rexlive-section-id="' . $rexlive_section_id . '"';
		}

		if (isset($rexlive_collapse_grid)) {
			echo ' data-rex-collapse-grid="false"';
		}

		if ($rexlive_model_id != '') {
			echo ' data-rexlive-model-id="' . $rexlive_model_id . '"';
		}

		if ($rexlive_model_name != '') {
			echo ' data-rexlive-model-name="' . $rexlive_model_name . '"';
		}

		echo ' data-rexlive-model-editing="false"';

		echo '>';

		echo '<div class="section-data" style="display: none;" ';
		foreach ($atts as $property_name => $value_property) {
			if ( 'video_bg_width_section' === $property_name && '' == $value_property && '' !== $videoMp4Width ) {
				$value_property = $videoMp4Width;
			}
			if ( 'video_bg_height_section' === $property_name && '' == $value_property && '' !== $videoMp4Height ) {
				$value_property = $videoMp4Height;
			}
			echo 'data-' . $property_name . '="' . ($value_property != "undefined"? $value_property : "" ). '" ';
		}

		unset($property_name);
		unset($value_property);
		if ('' != $video_bg_id_section && 'undefined' != $video_bg_id_section) {
			echo 'data-video_mp4_url="' . $video_mp4_url . '"';
		}
		echo '></div>';

		// if ( $editor ) {
			// include REXPANSIVE_BUILDER_PATH . "public/partials/rexlive-section-tools.php";
		// }

		echo $bg_video_markup;
		echo $bg_youtube_video_markup;
		echo $bg_video_vimeo_markup;
		echo $bg_video_toggle_audio_markup;

		echo '<div class="responsive-overlay"';
		echo $section_responsive_style;
		echo '>';

		if ('boxed' == $dimension) {
			echo '<div class="rex-row__dimension center-disposition'  . ( false !== $section_is_accordion ? ' rex-accordion--content' : '' ) . '"';
			if ('' != $section_width) {
				echo ' style="max-width:' . $section_width . ';"';
			}
			echo '>';
		} else {
			echo '<div class="rex-row__dimension full-disposition'  . ( false !== $section_is_accordion ? ' rex-accordion--content' : '' ) . '">';
		}

		do_action('rexpansive_section_before_grid', array(&$parsed_atts));

		echo '<div class="perfect-grid-gallery grid-stack grid-stack-row' . ( !empty( $grid_custom_classes ) ? ' ' . $grid_custom_classes : '' ) . '" data-separator="' . $block_distance . '" data-layout="' . $layout . '" data-full-height="' . (('true' == $full_height) ? 'true' : 'false') . '"' . $row_separators . ' data-rex-grid-id="' . $rexlive_section_id . '">';
		echo '<div class="perfect-grid-sizer"></div>';
		echo do_shortcode( $content );
		echo '</div>';
		echo '</div>';
		echo '</div>';

		if( false !== $section_is_accordion ) {
			echo '<div class="rex-accordion--toggle rexpansive-section-accordion__toggle"><i class="rex-svg-icons"><svg><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#plus"></use></svg></i></div>';
		}

		echo '</section>';
		return ob_get_clean();
	}
}
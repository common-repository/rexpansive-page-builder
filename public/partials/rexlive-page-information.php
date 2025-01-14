<?php
/**
 * Page builderlive infos
 * @since 2.0.0
 */
global $post;

// get buttons saved
$defaultButtonsIDs = '[]';
$buttonsIDsJSON = get_option( '_rex_buttons_ids', $defaultButtonsIDs );
$stripped = stripslashes( $buttonsIDsJSON );
$buttonsIDsUsed = json_decode($stripped, true);

// get sections saved
$defaultIDs = null;
$sectionsIDsJSON = get_option( '_rex_section_ids_used', $defaultIDs );
$sectionsIDsUsed = json_decode( $sectionsIDsJSON, true );

// Get blocks saved
$blocksIDsJSON = get_option( '_rex_blocks_ids_used', '[]' );

// get layouts available
$mobile = array("id" => "mobile", "label" => "Mobile", "min" => "320", "max" => "767", "type" => "standard");
$tablet = array("id" => "tablet", "label" => "Tablet", "min" => "768", "max" => "1024", "type" => "standard");
$default = array("id" => "default", "label" => "My Desktop", "min" => "1025", "max" => "", "type" => "standard");
$defaultLayoutsAvaiable = array($mobile, $tablet, $default);

$layoutsAvaiable = get_option( '_rex_responsive_layouts', $defaultLayoutsAvaiable );

$rexbuilderShortcode = get_post_meta( $post->ID, '_rexbuilder_shortcode', true );

// prepare default content for a draft just created
if ( empty( $rexbuilderShortcode ) && 'draft' === $post->post_status && 'true' === $backendEditing ) {
    $rexbuilderShortcode = '[RexpansiveSection section_name="" type="perfect-grid" color_bg_section="" color_bg_section_active="true" dimension="full" image_bg_section_active="true" image_bg_section="" id_image_bg_section="" video_bg_url_section="" video_bg_id_section="" video_bg_url_vimeo_section="" full_height="false" block_distance="20" layout="fixed" responsive_background="" custom_classes="" section_width="none" row_separator_top="20" row_separator_bottom="20" row_separator_right="20" row_separator_left="20" margin="" row_margin_top="0" row_margin_bottom="0" row_margin_right="0" row_margin_left="0" row_active_photoswipe="0" row_overlay_color="" row_overlay_active="false" rexlive_section_id="" rexlive_model_id="" rexlive_model_name="" row_edited_live="false"][/RexpansiveSection]';
}

if ( $rexbuilderShortcode == "" ) {
    if ( false !== strpos( $post->post_content, 'RexpansiveSection' ) || false !== strpos( $post->post_content, 'RexModel' ) ) {
        $rexbuilderShortcode = $post->post_content;
    }
} else {
    if ( false === strpos( $rexbuilderShortcode, 'RexpansiveSection' ) && false === strpos( $rexbuilderShortcode, 'RexModel' ) ) {
        $rexbuilderShortcode = "";
    }
}

// find models ids in page
$models_ids = array();
$pattern = get_shortcode_regex();
preg_match_all("/$pattern/", $rexbuilderShortcode, $matches);
foreach ($matches[2] as $index => $shortcode) {
    if ($shortcode == "RexModel") {
        $result = shortcode_parse_atts(trim($matches[3][$index]));
        array_push($models_ids, $result["id"]);
    }
}

$models_ids = array_unique($models_ids);

$models_customizations = array();
$models_customizations_avaiable = array();

$flag_models = false;

foreach($models_ids as $id){
    // Names
    $modelCustomizationsNames = get_post_meta($id, '_rex_model_customization_names', true);
    if($modelCustomizationsNames == ""){
        $modelCustomizationsNames = array();
    }
    $modelNames = array("id" => $id, "names" => $modelCustomizationsNames);
    array_push($models_customizations_avaiable, $modelNames);

    //Customizations Data
    $model_layouts = array();
    if (!empty($modelCustomizationsNames)) {
        $flag_models = true;
        foreach ($modelCustomizationsNames as $name) {
            $customization = array();
            $customization["name"] = $name;
            $customizationTargetsJSON = get_post_meta($id, '_rex_model_customization_' . $name, true);
            $targetsDecoded = json_decode($customizationTargetsJSON, true);
            $customization["targets"] = $targetsDecoded;
            array_push($model_layouts, $customization);
        }
    }

    $modelCustomizations = array("id" => $id, "customizations" => $model_layouts);

    array_push($models_customizations, $modelCustomizations);
}

$customizations_array = array();
$customizations_names = get_post_meta($post->ID, '_rex_responsive_layouts_names', true);
$flag_page_customization = false;
if (!empty($customizations_names)) {
    $flag_page_customization = true;
    foreach ($customizations_names as $name) {
        $customization = array();
        $customization["name"] = $name;
        $customizationSectionsJSON = get_post_meta($post->ID, '_rex_customization_' . $name, true);
        $sectionsDecoded = json_decode($customizationSectionsJSON, true);
        $customization["sections"] = $sectionsDecoded;
        array_push($customizations_array, $customization);
    }
}

?>
<script id="rex-buttons-ids-used" data-nosnippet><?php
if ( $buttonsIDsUsed == null ) {
    echo "[]";
} else {
    echo json_encode( $buttonsIDsUsed );
}
?></script>
<script id="sections-ids-used" data-nosnippet>
<?php
if ($sectionsIDsUsed == null) {
    echo "[]";
} else {
    echo json_encode($sectionsIDsUsed);
}
?>
</script>
<script id="blocks-ids-used" data-nosnippet><?php echo $blocksIDsJSON; ?></script>
<script id="layout-avaiable-dimensions" data-nosnippet><?php echo json_encode($layoutsAvaiable); ?></script>
<div id="rexbuilder-model-data" data-nosnippet style="display:none;">
    <div class="models-customizations" data-nosnippet <?php
    if (!$flag_models) {
        echo 'data-empty-models-customizations="true">';
    } else {
        ?>><?php
        foreach ($models_customizations as $model) {
            $idModel = $model['id'];
            echo '<div class="model-customizations-container" data-nosnippet data-model-id="'. $idModel .'">';
            $customizations = $model['customizations'];
            foreach($customizations as $custom){
                $customName = $custom['name'];
                $customTargets = $custom['targets'];

                if(isset($custom["targets"])){
                    $customTargets = $custom["targets"];
                } else{
                    $customTargets = "";
                }

                echo '<script class="model-customization-data" data-nosnippet data-model-layout-name="' . $customName . '">';

                if($customTargets != ""){
                    echo json_encode($customTargets);
                } else{
                    echo '[]';
                }
                echo '</script>';
            }
            echo '</div>';
        }
    }
    ?></div>
    <script class="available-models-customizations-names" data-nosnippet><?php echo json_encode($models_customizations_avaiable);?></script>
</div>
<div id="rexbuilder-layout-data" data-nosnippet style="display: none;">
    <div data-nosnippet class="layouts-customizations"<?php
    if (!$flag_page_customization) {
        echo ' data-empty-customizations="true">';
    } else {?>>
		<?php
        foreach ( $customizations_array as $customization ) {
            $customization_name = $customization['name'];
            echo '<div data-nosnippet class="customization-wrap" data-customization-name="' . $customization_name . '">';
            $sections = $customization['sections'];

            if ( $sections ) {
                foreach( $sections as $section_targets ) {
                    $sectionRexID = $section_targets["section_rex_id"];
                    $sectionModelNumber = $section_targets["section_model_number"];
                    $sectionModelID = $section_targets["section_model_id"];

                    if( isset( $section_targets["section_hide"] ) ) {
                        $hideSection = $section_targets["section_hide"];
                    } else {
                        $hideSection = "false";
                    }

                    if( isset( $section_targets["section_created_live"] ) ) {
                        $createdLive = $section_targets["section_created_live"];
                    } else {
                        $createdLive = "false";
                    }

                    if( isset( $section_targets["targets"] ) ) {
                        $targets = $section_targets["targets"];
                    } else{
                        $targets = "";
                    }

                    echo '<script data-nosnippet class="section-targets"';
                    echo ' data-section-rex-id="' . $sectionRexID . '"';
                    echo ' data-model-id="'.$sectionModelID.'"';
                    echo ' data-model-number="'.$sectionModelNumber.'"';
                    echo ' data-section-hide="'.$hideSection.'"';
                    echo ' data-section-created-live="'.$createdLive.'"';
                    echo '>';

                    if ( $targets != "" ) {
                        echo json_encode($targets);
                    } else {
                        echo "[]";
                    }
                    echo '</script>';
                }
            }
            echo '</div>';
        }
    }
    ?></div>
    <script data-nosnippet id="available-layouts-names"><?php
    if($customizations_names != ""){
        echo json_encode($customizations_names);
    }else{
        echo "[]";
    }
    ?></script>
</div>
<div data-nosnippet id="rexbuilder-layout-data-live" style="display: none;"></div><!-- // Current data of the builder -->
<div data-nosnippet id="rexbuilder-layouts-sections-order" style="display: none;"></div><!-- // Current order of the sections -->
<div data-nosnippet id="rexbuilder-default-layout-state" style="display: none;" data-empty-default-customization="true"></div>
<?php
do_action('rexpansive_builder_live_after_page_information', Rexbuilder_Utilities::isBuilderLive() );
